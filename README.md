# CodeCollab — Real-Time Collaborative DSA Platform

> A production-quality platform where 2–5 authenticated users share a private coding room, solve DSA problems together in a real-time shared Monaco editor, chat, run code safely, and review code history.

---

## Features

| Feature | Status |
|---------|--------|
| JWT authentication (HttpOnly cookie) | ✅ |
| Create & join private rooms (up to 5 members) | ✅ |
| Real-time collaborative Monaco editor | ✅ |
| Live presence — who is online | ✅ |
| Remote cursor tracking | ✅ |
| Room chat | ✅ |
| DSA problem library (10 seed problems) | ✅ |
| Safe code execution via Judge0 | ✅ |
| Code history & version restore | ✅ |
| Invite link system | ✅ |
| Rate limiting & security hardening | ✅ |

---

## Tech Stack

**Frontend:** React 18 · Vite · Tailwind CSS v3 · Monaco Editor · React Router v6 · Axios · Socket.IO Client  
**Backend:** Node.js 20 · Express.js · MongoDB + Mongoose · Socket.IO  
**Auth:** JWT · bcrypt · HttpOnly cookies  
**Execution:** Judge0 CE API (sandboxed)  
**Optional:** Redis (presence cache, Socket.IO adapter)

---

## Project Structure

```
/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/   auth/ editor/ room/ chat/ problems/ ui/
│       ├── context/      AuthContext.jsx  RoomContext.jsx
│       ├── pages/        Dashboard Room Problems Login Signup JoinRoom
│       ├── services/     api.js authService roomService ...
│       └── socket/       socketClient.js  socketEvents.js
│
├── server/          # Node.js + Express backend
│   └── src/
│       ├── config/       db.js redis.js env.js
│       ├── models/       User Room Problem CodingSession CodeVersion ChatMessage
│       ├── middleware/   authenticate authorize validate rateLimiter errorHandler
│       ├── routes/       auth room problem session history execute
│       ├── controllers/  one per route module
│       ├── services/     auth room session history execution
│       └── socket/       index.js + handlers/room editor chat presence
│
└── docs/            ARCHITECTURE.md API_CONTRACT.md SOCKET_EVENTS.md PROGRESS.md
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Redis (optional, falls back to in-memory)
- Judge0 API key (optional, mock mode available)

### Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, and optionally JUDGE0_API_KEY
npm install
npm run seed        # Seeds 10 DSA problems
npm run dev         # Starts on http://localhost:5000
```

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev         # Starts on http://localhost:5173
```

---

## Environment Variables

### Server (`server/.env`)
```
MONGO_URI=mongodb://localhost:27017/dsa_platform
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
REDIS_URL=                            # Optional
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_key_here          # Optional (mock mode if blank)
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

### Client (`client/.env`)
```
VITE_SERVER_URL=http://localhost:5000
```

---

## API Summary

| Module | Base Path |
|--------|-----------|
| Auth | `/api/auth` |
| Rooms | `/api/rooms` |
| Problems | `/api/problems` |
| Sessions | `/api/sessions` |
| History | `/api/history` |
| Execute | `/api/execute` |

Full contract: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)

---

## Real-Time Architecture

Socket.IO events are organized into namespaces by concern:
- **Room lifecycle:** `room:join`, `room:leave`, `room:state`, `room:closed`
- **Presence:** `presence:update`
- **Editor:** `code:change`, `code:update`, `code:sync-request/response`
- **Cursors:** `cursor:move/update`, `selection:change/update`
- **Chat:** `chat:send`, `chat:message`, `chat:history`
- **Execution:** `execution:start`, `execution:result`

Full contract: [`docs/SOCKET_EVENTS.md`](docs/SOCKET_EVENTS.md)

---

## Code Execution Architecture

User code is **never** executed in the Node.js process. All execution is delegated to [Judge0 CE](https://judge0.com):

```
Client → POST /api/execute → execution.service.js → Judge0 API → results
       ← socket broadcast ← execution:result event ←
```

If `JUDGE0_API_KEY` is not set, the service runs in mock mode and returns a placeholder response.

---

## Concurrency Model (Phase 1)

Uses **server-authoritative last-write-wins** with a monotonic `version` counter:
- Server increments version on each accepted change
- Clients with stale versions receive a sync response
- Architecture is designed for future OT/CRDT upgrade without changing the event contract

---

## Security

- bcrypt password hashing (cost 12)
- JWT in HttpOnly, SameSite cookies
- CORS restricted to `CLIENT_URL`
- Helmet security headers
- Rate limiting (auth: 20/15min, API: 200/15min, execution: 10/min)
- Socket events validate room membership before acting
- Chat content sanitized with `sanitize-html`
- No user code executed server-side

---

## Known Limitations

1. Simultaneous edits can cause last-write-wins overwrite (no OT/CRDT yet)
2. Judge0 free tier has rate limits (~50 req/day per IP)
3. Socket.IO scales single-process only without Redis adapter
4. No file upload / image support in chat

---

## Future Improvements

- Operational Transformation (yjs) for conflict-free editing
- Redis Socket.IO adapter for horizontal scaling
- Self-hosted Judge0 for higher execution limits
- Video/audio rooms (WebRTC)
- AI code hints (opt-in)
- User profile and statistics page
- Problem creation by admins

---

## Running Tests

```bash
cd server && npm test
```
