import api from './api';

export const roomService = {
  create: (data) => api.post('/rooms', data),
  list: () => api.get('/rooms'),
  get: (roomCode) => api.get(`/rooms/${roomCode}`),
  join: (roomCode) => api.post(`/rooms/${roomCode}/join`),
  close: (roomCode) => api.delete(`/rooms/${roomCode}`),
  removeMember: (roomCode, userId) => api.delete(`/rooms/${roomCode}/members/${userId}`),
  setProblem: (roomCode, problemId) => api.patch(`/rooms/${roomCode}/problem`, { problemId }),

  // ── Invite token flow ───────────────────────────────────────────────────
  /** Generate a new invite link for a room (member/owner only) */
  generateInvite: (roomCode) => api.post(`/invites/generate/${roomCode}`),

  /** Peek invite details — public, no auth required */
  peekInvite: (token) => api.get(`/invites/peek/${token}`),

  /** Accept an invite token — authenticated user joins the room */
  acceptInvite: (token) => api.post(`/invites/accept/${token}`),

  /** Revoke an invite link */
  revokeInvite: (token) => api.delete(`/invites/revoke/${token}`),

  /** List all active invites for a room (owner only) */
  listInvites: (roomCode) => api.get(`/invites/list/${roomCode}`),
};
