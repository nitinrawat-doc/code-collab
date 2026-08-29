/**
 * components/editor/BottomPanel.jsx
 *
 * Professional integrated VS Code-style bottom panel.
 * Features:
 *  - Vertical drag-resizing top border
 *  - 3 Tabs: TERMINAL, OUTPUT, PROBLEMS
 *  - Minimize, Maximize, and Close/Toggle controls
 *  - Real-time output streaming and Monaco line jump integration
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { TerminalTab } from './TerminalTab';
import { OutputTab } from './OutputTab';
import { ProblemsTab } from './ProblemsTab';

export const PANEL_TABS = {
  TERMINAL: 'terminal',
  OUTPUT: 'output',
  PROBLEMS: 'problems',
};

export function BottomPanel({
  roomCode,
  executionResult,
  executionLoading,
  language,
  onSelectError,
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}) {
  const [height, setHeight] = useState(240); // Initial panel height in px
  const [isMaximized, setIsMaximized] = useState(false);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(240);

  // Drag Resizing Logic
  const handleMouseDown = (e) => {
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    const newHeight = Math.min(Math.max(startHeightRef.current + deltaY, 120), window.innerHeight * 0.8);
    setHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  const currentHeight = isMaximized ? '75vh' : `${height}px`;

  const hasError = executionResult?.stderr || executionResult?.compileOutput;

  return (
    <div
      style={{ height: currentHeight }}
      className="flex flex-col bg-surface-900 border-t border-surface-600 shadow-2xl relative flex-shrink-0 transition-all duration-75 select-none"
    >
      {/* Resizable Top Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full bg-surface-700 hover:bg-brand-500 cursor-row-resize transition-colors flex items-center justify-center group absolute -top-1 left-0 right-0 z-20"
      >
        <div className="w-12 h-1 rounded-full bg-slate-500 group-hover:bg-white transition-colors" />
      </div>

      {/* Panel Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-600 flex-shrink-0 text-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange(PANEL_TABS.TERMINAL)}
            className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === PANEL_TABS.TERMINAL
                ? 'bg-surface-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>TERMINAL</span>
          </button>

          <button
            onClick={() => onTabChange(PANEL_TABS.OUTPUT)}
            className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === PANEL_TABS.OUTPUT
                ? 'bg-surface-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>OUTPUT</span>
            {executionLoading && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
          </button>

          <button
            onClick={() => onTabChange(PANEL_TABS.PROBLEMS)}
            className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === PANEL_TABS.PROBLEMS
                ? 'bg-surface-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>PROBLEMS</span>
            {hasError && <span className="w-2 h-2 rounded-full bg-red-400" />}
          </button>
        </div>

        {/* Panel Control Action Buttons */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* Maximize / Restore Button */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel'}
            className="p-1 hover:text-white hover:bg-surface-700 rounded transition-colors"
          >
            {isMaximized ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            title="Close Panel (Esc)"
            className="p-1 hover:text-white hover:bg-surface-700 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Content Panel Body */}
      <div className="flex-1 overflow-hidden select-text">
        {activeTab === PANEL_TABS.TERMINAL && <TerminalTab roomCode={roomCode} />}
        {activeTab === PANEL_TABS.OUTPUT && <OutputTab result={executionResult} loading={executionLoading} />}
        {activeTab === PANEL_TABS.PROBLEMS && (
          <ProblemsTab result={executionResult} language={language} onSelectError={onSelectError} />
        )}
      </div>
    </div>
  );
}
