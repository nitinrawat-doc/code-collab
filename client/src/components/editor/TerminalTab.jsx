/**
 * components/editor/TerminalTab.jsx
 *
 * Professional integrated terminal component.
 * Features:
 *  - Interactive command input prompt ($)
 *  - Command history navigation (Up / Down Arrow keys)
 *  - Real-time stream rendering of stdout, stderr, and system notifications
 *  - Quick toolbar: Clear, Kill Process, New Session, Auto-scroll Toggle
 *  - Dark VS Code terminal styling
 */

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../socket/socketClient';
import { EVENTS } from '../../socket/socketEvents';

export function TerminalTab({ roomCode }) {
  const [logs, setLogs] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize terminal session on mount
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    socket.emit(EVENTS.TERMINAL_INIT, { roomCode });

    const handleOutput = ({ data, type }) => {
      setLogs((prev) => [...prev, { id: Date.now() + Math.random(), text: data, type }]);
      if (type === 'stdout' || type === 'stderr') {
        setIsRunning(true);
      }
    };

    const handleClear = () => {
      setLogs([]);
      setIsRunning(false);
    };

    const handleExit = () => {
      setIsRunning(false);
    };

    socket.on(EVENTS.TERMINAL_OUTPUT, handleOutput);
    socket.on(EVENTS.TERMINAL_CLEAR, handleClear);
    socket.on(EVENTS.TERMINAL_EXIT, handleExit);

    return () => {
      socket.off(EVENTS.TERMINAL_OUTPUT, handleOutput);
      socket.off(EVENTS.TERMINAL_CLEAR, handleClear);
      socket.off(EVENTS.TERMINAL_EXIT, handleExit);
    };
  }, [roomCode]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle Command Submission
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = inputVal.trim();
      if (!cmd && !inputVal) return;

      // Render prompt line in log
      setLogs((prev) => [...prev, { id: Date.now(), text: `$ ${inputVal}\n`, type: 'command' }]);

      if (cmd) {
        setHistory((prev) => [...prev, cmd]);
        setHistoryIdx(-1);
      }

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(EVENTS.TERMINAL_INPUT, { roomCode, command: inputVal });
      } else {
        setLogs((prev) => [
          ...prev,
          { id: Date.now(), text: 'Error: Terminal disconnected from backend server.\n', type: 'stderr' },
        ]);
      }

      setInputVal('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
    }
  };

  const handleClearTerminal = () => {
    setLogs([]);
    setIsRunning(false);
  };

  const handleKillProcess = () => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(EVENTS.TERMINAL_KILL);
    }
  };

  const handleNewSession = () => {
    setLogs([]);
    setIsRunning(false);
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(EVENTS.TERMINAL_INIT, { roomCode });
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-900 text-slate-200 font-mono text-xs select-text">
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-600 flex-shrink-0 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isRunning ? 'Running Process...' : 'Bash / Shell (Sandboxed)'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Kill Button */}
          {isRunning && (
            <button
              onClick={handleKillProcess}
              title="Stop / Kill Running Process"
              className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Kill Process
            </button>
          )}

          {/* New Session Button */}
          <button
            onClick={handleNewSession}
            title="Restart Terminal Session"
            className="px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 transition-colors"
          >
            New Session
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClearTerminal}
            title="Clear Terminal Output"
            className="px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 transition-colors"
          >
            Clear
          </button>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle Auto Scroll"
            className={`px-2 py-0.5 rounded border transition-colors ${
              autoScroll
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'bg-surface-700 text-slate-400 border-surface-600'
            }`}
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div
        ref={containerRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 p-3 overflow-y-auto space-y-0.5 cursor-text leading-relaxed whitespace-pre-wrap break-all"
      >
        {logs.map((log) => {
          let styleClass = 'text-slate-300';
          if (log.type === 'command') styleClass = 'text-brand-300 font-semibold';
          else if (log.type === 'stderr') styleClass = 'text-red-400';
          else if (log.type === 'system') styleClass = 'text-cyan-400 font-medium';

          return (
            <div key={log.id} className={styleClass}>
              {log.text}
            </div>
          );
        })}

        {/* Input Prompt Row */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-bold flex-shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type terminal command..."
            className="flex-1 bg-transparent text-slate-100 outline-none font-mono text-xs border-none p-0 focus:ring-0"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}
