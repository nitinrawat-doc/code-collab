/**
 * services/api.js
 * Axios instance with dynamic base URL, credentials, and auth interceptors.
 * Dynamically resolves host IP so mobile and remote devices connect to the server correctly.
 */
import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    const rawUrl = import.meta.env.VITE_SERVER_URL;
    if (rawUrl.includes('localhost') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return rawUrl.replace('localhost', window.location.hostname) + '/api';
    }
    return `${rawUrl}/api`;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // send HttpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — prevent hard refresh loops on auth check endpoints
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const requestUrl = err.config?.url || '';
    const isAuthCheck =
      requestUrl.includes('/auth/me') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    if (err.response?.status === 401 && !isAuthCheck) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
