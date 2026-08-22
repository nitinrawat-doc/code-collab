# PROJECT SPEC — Real-Time Collaborative DSA Platform

> **Source of truth for architecture decisions, product scope, and implementation contracts.**
> Do not modify this file lightly — changes here affect the entire system.

---

## Product Summary

A real-time collaborative coding platform where 2–5 authenticated users share a private room, solve DSA problems together using a shared Monaco editor synchronized via Socket.IO, chat, run code safely via a sandboxed execution service, and review/restore code history.

**Target persona:** Two to five friends preparing for technical interviews together.

---

## Core Features (v1)

| # | Feature | Priority |
|---|---------|----------|
| 1 | Signup / Login / Logout (JWT + HttpOnly cookie) | P0 |
| 2 | Create / Join / Close private room | P0 |
| 3 | Real-time collaborative code editor (Monaco + Socket.IO) | P0 |
| 4 | Live presence — who is online | P0 |
| 5 | Room chat | P1 |
| 6 | DSA problem selection | P1 |
| 7 | Safe code execution (Judge0) | P1 |
| 8 | Code history / version restore | P2 |
| 9 | Remote cursor / selection | P2 |
| 10 | Dashboard + basic stats | P2 |

---

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS v3
- Monaco Editor (`@monaco-editor/react`)
- React Router v6
- Axios
- Socket.IO Client v4

### Backend
- Node.js 20 LTS
- Express.js 4
- MongoDB + Mongoose 7
- Socket.IO v4
- JWT (`jsonwebtoken`)
- bcryptjs
- Helmet, express-rate-limit, cors

### Optional Infrastructure
- Redis (Socket.IO adapter for horizontal scaling; presence cache)
- Judge0 CE API (sandboxed code execution)
- Docker (development environment)

---

## Participant Limits

- Maximum **5 users per room** including the owner
- Rooms are private (join by invite code only)
- Room status: `active` | `closed`

---

## Authorization Model

| Action | Requirement |
|--------|-------------|
| View room | Member of room |
| Edit code | Member |
| Send chat | Member |
| Select problem | Member |
| Run code | Member |
| Remove member | Room owner |
| Close room | Room owner |
| Join room | Authenticated + room active + room not full |

---

## Security Invariants

1. Passwords are never stored in plaintext (bcrypt, cost 12)
2. JWTs never exposed in localStorage (HttpOnly cookie)
3. User code is never executed in the main Node process (Judge0 sandbox)
4. All protected endpoints require valid JWT
5. Socket events validate membership before acting
6. Chat content is sanitized before storage
7. No secrets in source code — all via `.env`
8. CORS restricted to known client origin

---

## Out of Scope (v1)

- Payment / subscriptions
- Video/audio calls
- AI code assistance
- Public rooms
- Social follow/friend system
- Problem creation by users
- Competitive mode / leaderboard

---

## File References

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | System architecture deep-dive |
| `docs/API_CONTRACT.md` | Complete REST API specification |
| `docs/SOCKET_EVENTS.md` | Socket.IO event contract |
| `docs/PROGRESS.md` | Stage-by-stage implementation log |
| `README.md` | Public-facing documentation |
