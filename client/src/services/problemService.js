import api from './api';

export const problemService = {
  list: (params) => api.get('/problems', { params }),
  get: (slug) => api.get(`/problems/${slug}`),
};
