/**
 * socket/events.js
 * Single source of truth for all Socket.IO event names.
 * Imported by both server handlers and (if using Node-compatible imports) client code.
 */
const EVENTS = {
  // Room lifecycle
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_STATE: 'room:state',
  ROOM_CLOSED: 'room:closed',

  // Presence
  PRESENCE_UPDATE: 'presence:update',

  // Code editing
  CODE_CHANGE: 'code:change',
  CODE_UPDATE: 'code:update',
  CODE_SYNC_REQUEST: 'code:sync-request',
  CODE_SYNC_RESPONSE: 'code:sync-response',

  // Remote cursors
  CURSOR_MOVE: 'cursor:move',
  CURSOR_UPDATE: 'cursor:update',
  SELECTION_CHANGE: 'selection:change',
  SELECTION_UPDATE: 'selection:update',

  // Chat
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',

  // Problem
  PROBLEM_CHANGE: 'problem:change',
  PROBLEM_UPDATE: 'problem:update',

  // Code execution
  EXECUTION_START: 'execution:start',
  EXECUTION_RESULT: 'execution:result',

  // Member management
  MEMBER_REMOVED: 'member:removed',

  // Terminal events
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_CLEAR: 'terminal:clear',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_INIT: 'terminal:init',
  TERMINAL_EXIT: 'terminal:exit',

  // Generic
  ERROR: 'error',
};

module.exports = EVENTS;
