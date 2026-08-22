/**
 * config/db.js
 * Establishes and exports the Mongoose connection.
 */
const mongoose = require('mongoose');
const { MONGO_URI, NODE_ENV } = require('./env');

const connect = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      // Mongoose 7+ defaults are fine; explicit options for clarity
    });
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    process.exit(1);
  }
};

// Log slow queries in development
if (NODE_ENV === 'development') {
  mongoose.set('debug', false); // set true to log all queries
}

module.exports = { connect };
