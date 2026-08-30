import api from './api';

export const sessionService = {
  get: (roomCode) => api.get(`/sessions/room/${roomCode}`),
  save: (roomCode, label, code = null) => api.post(`/sessions/room/${roomCode}/save`, { label, code }),
};

export const historyService = {
  list: (roomCode, params) => api.get(`/history/room/${roomCode}`, { params }),
  get: (roomCode, versionId) => api.get(`/history/room/${roomCode}/${versionId}`),
  restore: (roomCode, versionId) => api.post(`/history/room/${roomCode}/${versionId}/restore`),
  delete: (roomCode, versionId) => api.delete(`/history/room/${roomCode}/${versionId}`),
};

export const executeService = {
  run: (data) => api.post('/execute', data),
};
