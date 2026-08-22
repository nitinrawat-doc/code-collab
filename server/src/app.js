/**
 * app.js
 * Express application setup — middleware, routes, error handling.
 * Does NOT start the HTTP server (that's server.js).
 */
require('./config/env'); // validate env vars first
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roomRoutes = require('./routes/room.routes');
const problemRoutes = require('./routes/problem.routes');
const sessionRoutes = require('./routes/session.routes');
const historyRoutes = require('./routes/history.routes');
const executeRoutes = require('./routes/execute.routes');

const { CLIENT_URL } = require('./config/env');

const app = express();

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Match localhost, 127.0.0.1, or local LAN IP (e.g. 192.168.x.x, 10.x.x.x) on ports 5170-5179
  if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):517[0-9]$/.test(origin)) return true;
  // Match local tunnels or cloud deployments
  if (origin.endsWith('.loca.lt') || origin.endsWith('.ngrok-free.app') || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return true;
  return false;
};

// Security headers — allow cross-origin resource policy for API client
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — allow configured client origins with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Network info check for sharing LAN IP invite links
app.get('/api/network-info', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  res.json({
    success: true,
    localIp: ips[0] || 'localhost',
    ips,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/execute', executeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
