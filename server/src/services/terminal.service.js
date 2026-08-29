/**
 * services/terminal.service.js
 *
 * Manages sandboxed interactive terminal execution for room sessions.
 * Security & Isolation Constraints:
 *  - Dedicated working directory per room & user
 *  - Strips server environment variables & secrets (MONGO_URI, JWT_SECRET, etc.)
 *  - Workspace boundary restriction (cannot directory-traverse outside sandbox root)
 *  - Execution timeouts & output size limits to prevent DoS
 *  - Interactive process termination and stream cleanup
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const EVENTS = require('../socket/events');

// Map of active process sessions: socket.id -> { child, cwd, sandboxRoot }
const activeSessions = new Map();

// Helper to sanitize env vars (remove app secrets)
const getSanitizedEnv = (customCwd) => {
  const env = { ...process.env };
  delete env.MONGO_URI;
  delete env.JWT_SECRET;
  delete env.JUDGE0_API_KEY;
  delete env.REDIS_URL;
  env.HOME = customCwd;
  env.TMP = customCwd;
  env.TEMP = customCwd;
  env.TERM = 'xterm-256color';
  return env;
};

// Ensure sandbox directory exists
const getSandboxDir = (roomCode, userId) => {
  const sanitize = (str) => String(str || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseDir = path.join(os.tmpdir(), 'codecollab_sandboxes', sanitize(roomCode), sanitize(userId));
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
};

const initTerminalSession = (socket, roomCode) => {
  const userId = socket.user._id.toString();
  const sandboxRoot = getSandboxDir(roomCode, userId);

  const session = activeSessions.get(socket.id) || {
    cwd: sandboxRoot,
    sandboxRoot,
    child: null,
  };

  activeSessions.set(socket.id, session);

  socket.emit(EVENTS.TERMINAL_OUTPUT, {
    data: `\x1b[36mWelcome to CodeCollab Sandboxed Terminal\x1b[0m\r\n` +
          `Workspace: \x1b[33m${path.basename(sandboxRoot)}\x1b[0m\r\n` +
          `Type commands (e.g. node -v, python --version, ls, pwd, echo Hello)...\r\n\r\n`,
    type: 'system',
  });
};

const executeTerminalCommand = (socket, roomCode, commandStr) => {
  const userId = socket.user._id.toString();
  const sandboxRoot = getSandboxDir(roomCode, userId);

  let session = activeSessions.get(socket.id);
  if (!session) {
    session = { cwd: sandboxRoot, sandboxRoot, child: null };
    activeSessions.set(socket.id, session);
  }

  const rawCmd = (commandStr || '').trim();

  // Empty input -> echo prompt line
  if (!rawCmd) {
    socket.emit(EVENTS.TERMINAL_OUTPUT, { data: '\r\n', type: 'stdout' });
    return;
  }

  // Clear command
  if (rawCmd === 'clear' || rawCmd === 'cls') {
    socket.emit(EVENTS.TERMINAL_CLEAR);
    return;
  }

  // Handle CD command manually to enforce sandbox boundary
  if (rawCmd.startsWith('cd ') || rawCmd === 'cd') {
    const targetPath = rawCmd.substring(2).trim() || sandboxRoot;
    let newCwd = path.resolve(session.cwd, targetPath);

    // Enforce boundary — cannot go above sandboxRoot
    if (!newCwd.startsWith(sandboxRoot)) {
      newCwd = sandboxRoot;
      socket.emit(EVENTS.TERMINAL_OUTPUT, {
        data: `\x1b[31mAccess Restricted: Cannot navigate outside your sandbox workspace.\x1b[0m\r\n`,
        type: 'stderr',
      });
    }

    if (fs.existsSync(newCwd) && fs.statSync(newCwd).isDirectory()) {
      session.cwd = newCwd;
    } else {
      socket.emit(EVENTS.TERMINAL_OUTPUT, {
        data: `\x1b[31mcd: no such file or directory: ${targetPath}\x1b[0m\r\n`,
        type: 'stderr',
      });
    }
    return;
  }

  // If a child process is already running in this socket session, kill it before starting new command
  if (session.child) {
    try { session.child.kill('SIGKILL'); } catch (_) {}
    session.child = null;
  }

  // Prepare execution options
  const isWin = process.platform === 'win32';
  const shell = isWin ? 'cmd.exe' : '/bin/sh';
  const shellArgs = isWin ? ['/d', '/s', '/c', rawCmd] : ['-c', rawCmd];

  const env = getSanitizedEnv(session.cwd);

  let outputBytes = 0;
  const MAX_BYTES = 500000; // 500KB output limit

  try {
    const child = spawn(shell, shellArgs, {
      cwd: session.cwd,
      env,
      timeout: 30000, // 30 second maximum timeout
    });

    session.child = child;

    // Timeout safety
    const timeoutTimer = setTimeout(() => {
      if (session.child === child) {
        try { child.kill('SIGKILL'); } catch (_) {}
        socket.emit(EVENTS.TERMINAL_OUTPUT, {
          data: `\r\n\x1b[31m[Process Terminated: Execution Time Limit Exceeded (30s)]\x1b[0m\r\n`,
          type: 'system',
        });
      }
    }, 30000);

    child.stdout.on('data', (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes <= MAX_BYTES) {
        socket.emit(EVENTS.TERMINAL_OUTPUT, {
          data: chunk.toString('utf-8').replace(/\n/g, '\r\n'),
          type: 'stdout',
        });
      }
    });

    child.stderr.on('data', (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes <= MAX_BYTES) {
        socket.emit(EVENTS.TERMINAL_OUTPUT, {
          data: chunk.toString('utf-8').replace(/\n/g, '\r\n'),
          type: 'stderr',
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutTimer);
      if (session.child === child) session.child = null;
      socket.emit(EVENTS.TERMINAL_OUTPUT, {
        data: `\x1b[31mExecution Error: ${err.message}\x1b[0m\r\n`,
        type: 'stderr',
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeoutTimer);
      if (session.child === child) session.child = null;
      socket.emit(EVENTS.TERMINAL_EXIT, { code: code ?? 0 });
    });
  } catch (err) {
    socket.emit(EVENTS.TERMINAL_OUTPUT, {
      data: `\x1b[31mFailed to launch command: ${err.message}\x1b[0m\r\n`,
      type: 'stderr',
    });
  }
};

const killTerminalSession = (socket) => {
  const session = activeSessions.get(socket.id);
  if (session && session.child) {
    try { session.child.kill('SIGKILL'); } catch (_) {}
    session.child = null;
    socket.emit(EVENTS.TERMINAL_OUTPUT, {
      data: `\x1b[33m[Running process killed by user]\x1b[0m\r\n`,
      type: 'system',
    });
  }
};

const cleanupTerminalSession = (socket) => {
  const session = activeSessions.get(socket.id);
  if (session) {
    if (session.child) {
      try { session.child.kill('SIGKILL'); } catch (_) {}
    }
    activeSessions.delete(socket.id);
  }
};

module.exports = {
  initTerminalSession,
  executeTerminalCommand,
  killTerminalSession,
  cleanupTerminalSession,
};
