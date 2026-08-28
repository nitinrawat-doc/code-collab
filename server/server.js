/**
 * server.js
 * Entry point — creates HTTP server, attaches Socket.IO, connects DB.
 */
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { connect: connectDB } = require('./src/config/db');
const { initSocket } = require('./src/socket');
const { PORT, CLIENT_URL } = require('./src/config/env');

const server = http.createServer(app);

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

// Attach Socket.IO with CORS matching Express config
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Socket CORS not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

initSocket(io);
app.set('io', io); // make io accessible in controllers via req.app.get('io')


const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
    console.log(`[server] Accepting Socket.IO from ${CLIENT_URL}`);
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch and log unhandled errors — prevents silent nodemon crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Don't exit — let the error handler deal with per-request rejections
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1); // Restart via nodemon
});

start().catch((err) => {
  console.error('[server] Startup failed:', err.message);
  process.exit(1);
});
