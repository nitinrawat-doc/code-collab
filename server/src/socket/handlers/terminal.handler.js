/**
 * socket/handlers/terminal.handler.js
 * Registers real-time interactive terminal event listeners.
 */

const EVENTS = require('../events');
const {
  initTerminalSession,
  executeTerminalCommand,
  killTerminalSession,
  cleanupTerminalSession,
} = require('../../services/terminal.service');

const registerTerminalHandlers = (io, socket) => {
  socket.on(EVENTS.TERMINAL_INIT, ({ roomCode }) => {
    initTerminalSession(socket, roomCode);
  });

  socket.on(EVENTS.TERMINAL_INPUT, ({ roomCode, command }) => {
    executeTerminalCommand(socket, roomCode, command);
  });

  socket.on(EVENTS.TERMINAL_KILL, () => {
    killTerminalSession(socket);
  });

  socket.on('disconnect', () => {
    cleanupTerminalSession(socket);
  });
};

module.exports = { registerTerminalHandlers };
