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
  const { protocol, hostname, port } = window.location;

  // Local dev — use VITE_SERVER_URL or fallback to :5000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000') + '/api';
  }

  // Served without an explicit port (tunnel, ngrok, deployed — standard 80/443)
  // Backend is on the SAME host/origin; just append /api
  if (!port || port === '80' || port === '443') {
    return `${protocol}//${hostname}/api`;
  }

  // LAN / explicit port (e.g. phone opened http://192.168.x.x:5173)
  // Backend runs on :5000 on the same machine
  return `${protocol}//${hostname}:5000/api`;
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
