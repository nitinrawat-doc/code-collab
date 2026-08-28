/**
 * services/api.js
 * Axios instance with dynamic base URL, credentials, and auth interceptors.
 *
 * URL resolution strategy:
 *  - localhost / 127.0.0.1  → direct to VITE_SERVER_URL (dev, Vite proxy handles /api)
 *  - Any other host with NO explicit port (e.g. loca.lt tunnel, ngrok, vercel)
 *    → use window.location.origin/api  (same host, standard port — works on tunnel!)
 *  - Any other host WITH an explicit port (e.g. LAN 10.x.x.x:5173)
 *    → backend is always on :5000, swap the port
 */
import axios from 'axios';

const getApiBaseUrl = () => {
  const { hostname } = window.location;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000') + '/api';
  }

  // Production / deployed frontend
  const serverUrl = import.meta.env.VITE_SERVER_URL || '';
  return serverUrl ? `${serverUrl.replace(/\/$/, '')}/api` : '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // send HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
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
