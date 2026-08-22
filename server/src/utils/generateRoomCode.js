/**
 * utils/generateRoomCode.js
 * Generates a unique 8-character alphanumeric room code using Node crypto.
 */
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const generateRoomCode = () => {
  let result = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
};

module.exports = generateRoomCode;

