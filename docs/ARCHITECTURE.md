# ARCHITECTURE — Real-Time Collaborative DSA Platform

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER CLIENT                      │
│  React 18 + Vite + Tailwind + Monaco + Socket.IO-client │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (REST) / WSS (Socket.IO)
┌────────────────────────▼────────────────────────────────┐
│                  EXPRESS.JS SERVER (Node 20)              │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────────────┐    │
│  │   REST API        │   │    Socket.IO Server      │    │
│  │  /api/auth        │   │  JWT handshake           │    │
│  │  /api/rooms       │   │  room handlers           │    │
│  │  /api/problems    │   │  editor handlers         │    │
│  │  /api/sessions    │   │  chat handlers           │    │
│  │  /api/history     │   │  presence handlers       │    │
│  │  /api/execute     │   │  execution handlers      │    │
│  └──────────────────┘   └──────────────────────────┘    │
│                                                          │
│  Middleware: authenticate · authorize · rateLimiter      │
│             validate · errorHandler · helmet · cors      │
└──────┬────────────────────────────────┬─────────────────┘
       │                                │
┌──────▼──────────┐          ┌──────────▼──────────┐
│    MongoDB       │          │    Redis (optional)  │
│    (Mongoose)    │          │                     │
│                  │          │  - presence map      │
│  Collections:    │          │  - socket-room map   │
│  users           │          │  - rate-limit store  │
│  rooms           │          │  - Socket.IO adapter │
│  problems        │          │    (for scaling)     │
│  codingsessions  │          └─────────────────────┘
│  codeversions    │
│  chatmessages    │          ┌─────────────────────┐
└──────────────────┘          │   Judge0 CE API      │
                              │   (external sandbox) │
                              │                     │
                              │  POST /submissions   │
                              │  GET /submissions/:t │
                              └─────────────────────┘
```

---

## Data Flow

### Login Flow
```
Client → POST /api/auth/login (email + password)
Server → validate input → find User by email → bcrypt.compare
       → generate JWT (userId, exp: 7d)
       → Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
       → respond with user object (no passwordHash)
Client → store user in AuthContext → redirect to Dashboard
```

### Create Room Flow
```
Client (auth) → POST /api/rooms { name }
Server → generate unique roomCode (8-char alphanumeric)
       → create Room doc (owner = req.user._id, members: [{user, role:'owner'}])
       → create CodingSession doc (room = roomId)
       → respond with { room, session }
Client → navigate to /room/:roomCode
```

### Join Room Flow
```
Client (auth) → POST /api/rooms/:roomCode/join
Server → find room by roomCode → check status === 'active'
       → check members.length < maxMembers
       → check user not already a member
       → push { user, role:'member' } to members
       → respond with { room }
Client → navigate to /room/:roomCode
```

### Socket Connect + Room Join Flow
```
Client → socket.connect() with { auth: { token } }
Server socket middleware → verify JWT → attach socket.user
Client → emit room:join { roomCode }
Server → validate user is member of room (DB check)
       → socket.join(roomCode)
       → fetch current code from CodingSession
       → fetch last 50 ChatMessages
       → emit room:state to this socket { code, language, problem, onlineUsers, chatHistory }
       → broadcast presence:update to room (all online users)
```

### Code Synchronization Flow
```
User A edits → Monaco onChange fires
Client A → emit code:change { roomCode, fullCode, language, version }
Server → validate member
       → compare version (reject if stale)
       → increment server version
       → update Redis cache (if available)
       → debounce DB write to CodingSession (500ms)
       → broadcast code:update { fullCode, language, version, userId } to room except A
Clients B,C,D → receive code:update → replace editor value (suppress onChange)
```

### Code Execution Flow
```
Client → POST /api/execute { roomCode, code, language, problemSlug }
Server → validate member → find problem → find test cases
       → call execution.service.js:
           → encode code + stdin to base64
           → POST to Judge0 /submissions?wait=true (or poll)
           → map Judge0 status to { Accepted | WrongAnswer | RuntimeError | TLE | ... }
       → socket.to(roomCode).emit('execution:result', { results, status, userId })
       → respond to caller with same result
```

### Save History Flow
```
Triggered by:
  (a) Manual: POST /api/sessions/room/:roomCode/save
  (b) Automatic: on problem change, on room close

Server → read current code from CodingSession
       → create CodeVersion { session, room, code, language, savedBy, label, createdAt }
       → keep last 50 versions per session (cleanup job or pre-save hook)
```

---

## Concurrency Model

Phase 1 uses **server-authoritative last-write-wins** with a monotonic version counter:

- Server maintains `{ code, version }` — the single source of truth
- On receiving `code:change`, server only applies if `payload.version >= server.version - 1`
- Server increments version and broadcasts to all other clients
- This prevents true conflicts in low-latency scenarios (same room, same geographic region)

**Known limitation:** Two users editing simultaneously may see one overwrite the other. This is documented honestly and is acceptable for v1 (same as early Google Docs before OT was introduced).

**OT/CRDT upgrade path:**
- The `delta` field in `code:change` is reserved for operational deltas
- The `editor.handler.js` can be swapped to process OT operations without changing the event contract
- Recommend `ot.js` or `yjs` for future upgrade

---

## Redis Usage

Redis is optional but recommended for production:

| Use Case | Redis Key Pattern | Fallback |
|----------|------------------|---------|
| Online users per room | `presence:roomCode` (Set) | In-memory Map in socket/index.js |
| Canonical code cache | `code:roomCode` (String) | CodingSession DB document |
| Rate limit counters | handled by rate-limit-redis | In-memory (express-rate-limit) |
| Socket.IO adapter | `socket.io-redis` | Single-process only |

The Redis client (`config/redis.js`) is wrapped to be no-op if `REDIS_URL` is not set.

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Password storage | bcrypt, cost factor 12 |
| Session token | JWT, 7-day expiry, HttpOnly cookie |
| CSRF mitigation | SameSite=Strict cookie + CORS restriction |
| Route protection | `authenticate` middleware on all `/api/*` except auth |
| Socket protection | JWT verification in Socket.IO handshake middleware |
| Room access control | Member check in every socket handler + API endpoint |
| Owner-only actions | `authorize('owner')` middleware / inline check |
| Input validation | Joi schema validation on all request bodies |
| Output sanitization | Chat content sanitized with `sanitize-html` |
| Code execution | Delegated entirely to Judge0 sandbox (not child_process) |
| HTTP headers | Helmet.js defaults |
| Rate limiting | express-rate-limit on all routes; stricter on /auth |
| CORS | Restricted to `CLIENT_URL` env variable |
| Secrets | 100% via environment variables, never committed |
