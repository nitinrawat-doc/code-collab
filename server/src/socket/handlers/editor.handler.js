/**
 * socket/handlers/editor.handler.js
 * Handles collaborative code editing events.
 */
const Room = require('../../models/Room');
const CodingSession = require('../../models/CodingSession');
const EVENTS = require('../events');
const redis = require('../../config/redis');

// Debounce map: roomCode -> timeout handle
const debounceMap = new Map();
const DEBOUNCE_MS = 1500;

const registerEditorHandlers = (io, socket) => {
  /**
   * code:change
   * Client sends updated code. Server validates, updates authoritative state,
   * and broadcasts to other room members.
   */
  socket.on(EVENTS.CODE_CHANGE, async ({ roomCode, fullCode, language, version }) => {
    try {
      if (!roomCode || fullCode === undefined) return;

      // Fast membership check via Room model
      const room = await Room.findOne({ roomCode }).select('_id members status');
      if (!room || room.status === 'closed') return;
      if (!room.isMember(socket.user._id)) return;

      // Get authoritative session
      const session = await CodingSession.findOne({ room: room._id });
      if (!session) return;

      // Stale write guard
      if (version < session.version - 1) {
        // Client is too far behind — send sync
        socket.emit(EVENTS.CODE_SYNC_RESPONSE, {
          fullCode: session.currentCode,
          language: session.language,
          version: session.version,
        });
        return;
      }

      // Update in-memory session version
      session.currentCode = fullCode;
      if (language) session.language = language;
      session.version += 1;

      // Update Redis cache immediately (fast)
      await redis.setCode(roomCode, fullCode);

      // Debounced DB persist (avoid hammering MongoDB on every keystroke)
      if (debounceMap.has(roomCode)) clearTimeout(debounceMap.get(roomCode));
      debounceMap.set(
        roomCode,
        setTimeout(async () => {
          await CodingSession.updateOne(
            { room: room._id },
            { currentCode: fullCode, language: session.language, version: session.version }
          );
          debounceMap.delete(roomCode);
        }, DEBOUNCE_MS)
      );

      // Broadcast to everyone else in the room
      socket.to(roomCode).emit(EVENTS.CODE_UPDATE, {
        fullCode,
        language: session.language,
        version: session.version,
        userId: socket.user._id.toString(),
      });
    } catch (err) {
      console.error('[socket] code:change error:', err.message);
    }
  });

  /**
   * code:sync-request
   * Client requests the authoritative code state (e.g., after reconnect).
   */
  socket.on(EVENTS.CODE_SYNC_REQUEST, async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode }).select('_id');
      if (!room) return;
      const session = await CodingSession.findOne({ room: room._id });
      if (!session) return;

      socket.emit(EVENTS.CODE_SYNC_RESPONSE, {
        fullCode: session.currentCode,
        language: session.language,
        version: session.version,
      });
    } catch (err) {
      console.error('[socket] code:sync-request error:', err.message);
    }
  });

  /**
   * cursor:move
   * Broadcasts cursor position to other room members.
   */
  socket.on(EVENTS.CURSOR_MOVE, ({ roomCode, position }) => {
    if (!roomCode || !position) return;
    socket.to(roomCode).emit(EVENTS.CURSOR_UPDATE, {
      userId: socket.user._id.toString(),
      name: socket.user.name,
      position,
    });
  });

  /**
   * selection:change
   * Broadcasts selection to other room members.
   */
  socket.on(EVENTS.SELECTION_CHANGE, ({ roomCode, selection }) => {
    if (!roomCode || !selection) return;
    socket.to(roomCode).emit(EVENTS.SELECTION_UPDATE, {
      userId: socket.user._id.toString(),
      selection,
    });
  });
};

module.exports = { registerEditorHandlers };
