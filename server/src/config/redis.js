/**
 * config/redis.js
 * Optional Redis client. If REDIS_URL is not set, all methods are no-ops.
 * This allows the app to run without Redis in development.
 */
const { REDIS_URL } = require('./env');

let client = null;

if (REDIS_URL) {
  const { default: Redis } = require('ioredis');
  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on('connect', () => console.log('[redis] Connected'));
  client.on('error', (err) => console.error('[redis] Error:', err.message));
} else {
  console.log('[redis] REDIS_URL not set — using in-memory fallback for presence');
}

/**
 * A thin wrapper so callers don't need to check if client exists.
 * Falls back to a simple in-memory Map for presence tracking.
 */
const inMemoryPresence = new Map(); // roomCode -> Set of userIds

const redis = {
  isConnected: () => !!client,

  // Generic key-value
  set: async (key, value, ttlSeconds = null) => {
    if (!client) return;
    if (ttlSeconds) await client.set(key, value, 'EX', ttlSeconds);
    else await client.set(key, value);
  },
  get: async (key) => {
    if (!client) return null;
    return client.get(key);
  },
  del: async (key) => {
    if (!client) return;
    return client.del(key);
  },

  // Presence: track online users per room
  addPresence: async (roomCode, userId) => {
    if (client) {
      await client.sadd(`presence:${roomCode}`, userId);
      await client.expire(`presence:${roomCode}`, 3600);
    } else {
      if (!inMemoryPresence.has(roomCode)) inMemoryPresence.set(roomCode, new Set());
      inMemoryPresence.get(roomCode).add(userId);
    }
  },
  removePresence: async (roomCode, userId) => {
    if (client) {
      await client.srem(`presence:${roomCode}`, userId);
    } else {
      inMemoryPresence.get(roomCode)?.delete(userId);
    }
  },
  getPresence: async (roomCode) => {
    if (client) {
      return client.smembers(`presence:${roomCode}`);
    }
    return [...(inMemoryPresence.get(roomCode) || [])];
  },

  // Code cache
  setCode: async (roomCode, code) => {
    if (client) await client.set(`code:${roomCode}`, code, 'EX', 7200);
  },
  getCode: async (roomCode) => {
    if (!client) return null;
    return client.get(`code:${roomCode}`);
  },
};

module.exports = redis;
