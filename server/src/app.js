/**
 * app.js
 * Express application setup — middleware, routes, static frontend serving, error handling.
 */
require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

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
const inviteRoutes = require('./routes/invite.routes');

const { CLIENT_URL } = require('./config/env');

const app = express();

// Trust the first proxy (needed when behind tunnel/ngrok/serveo — fixes rate-limiter X-Forwarded-For)
app.set('trust proxy', 1);

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):517[0-9]$/.test(origin)) return true;
  if (origin.endsWith('.loca.lt') || origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok.io') || origin.endsWith('.serveousercontent.com') || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return true;
  return false;
};

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // allow loading scripts/styles when served via tunnel
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Bypass-Tunnel-Reminder', 'bypass-tunnel-reminder', 'x-github-token', 'X-GitHub-Token'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve client production static files if client/dist exists
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Global rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Network info check for sharing LAN IP and Public HTTPS Tunnel invite links
app.get('/api/network-info', async (req, res) => {
  const os = require('os');
  const { getPublicTunnelUrl, getPublicIp } = require('./services/tunnel.service');
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  const publicIp = await getPublicIp();
  res.json({
    success: true,
    localIp: ips[0] || 'localhost',
    publicTunnelUrl: getPublicTunnelUrl() || '',
    publicIp: publicIp || '',
    ips,
  });
});

const githubRoutes = require('./routes/github.routes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/github', githubRoutes);

// SPA fallback: render index.html for all non-API client routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
