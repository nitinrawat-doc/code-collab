/**
 * config/env.js
 * Validates and exports all required environment variables.
 * Fails fast at startup if critical vars are missing.
 */
require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[env] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  REDIS_URL: process.env.REDIS_URL || null,
  JUDGE0_API_URL: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com',
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY || null,
  JUDGE0_API_HOST: process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',
  // Tunnel: fixed subdomain for serveo.net → https://<TUNNEL_SUBDOMAIN>.serveo.net
  TUNNEL_SUBDOMAIN: process.env.TUNNEL_SUBDOMAIN || 'codecollab-live',
};
