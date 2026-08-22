import api from './api';

export const roomService = {
  create: (data) => api.post('/rooms', data),
  list: () => api.get('/rooms'),
  get: (roomCode) => api.get(`/rooms/${roomCode}`),
  join: (roomCode) => api.post(`/rooms/${roomCode}/join`),
  close: (roomCode) => api.delete(`/rooms/${roomCode}`),
  removeMember: (roomCode, userId) => api.delete(`/rooms/${roomCode}/members/${userId}`),
  setProblem: (roomCode, problemId) => api.patch(`/rooms/${roomCode}/problem`, { problemId }),
};
