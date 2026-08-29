/**
 * components/editor/ProblemsTab.jsx
 *
 * Displays parsed compilation and runtime errors.
 * Clicking a problem item jumps Monaco Editor to the corresponding line & column.
 */

import { useMemo } from 'react';
import { normalizeExecutionResult } from './OutputTab';

/**
 * Parses raw error logs for C++, Java, Python, and JavaScript
 */
const parseErrors = (errorText, language) => {
  if (!errorText || typeof errorText !== 'string') return [];

  const lines = errorText.split('\n');
  const problems = [];

  lines.forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    if (!trimmed) return;

    // 1. C++ / GCC:  filename.cpp:5:10: error: 'x' was not declared in this scope
    // 2. Java:      Solution.java:12: error: cannot find symbol
    let match = lineText.match(/([a-zA-Z0-9_\-\.\/]+):(\d+):(?:(\d+):)?\s*(error|warning|fatal error):\s*(.*)/i);
    if (match) {
      problems.push({
        id: `err-${idx}`,
        fileName: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : 1,
        severity: match[4].toLowerCase().includes('warn') ? 'warning' : 'error',
        message: match[5] || trimmed,
        raw: trimmed,
      });
      return;
    }

    // 3. Python:  File "main.py", line 7, in <module>
    match = lineText.match(/File\s+["']?([^"',\n]+)["']?,\s*line\s*(\d+)(?:,\s*in\s+(.*))?/i);
    if (match) {
      const nextLine = lines[idx + 1] ? lines[idx + 1].trim() : '';
      problems.push({
        id: `py-err-${idx}`,
        fileName: match[1],
        line: parseInt(match[2], 10),
        column: 1,
        severity: 'error',
        message: nextLine || `Error at line ${match[2]} in ${match[3] || 'scope'}`,
        raw: trimmed,
      });
      return;
    }

    // 4. Node.js / JS: at main.js:5:12 or at Object.<anonymous> (evalmachine.<anonymous>:4:15)
    match = lineText.match(/at\s+.*?\s+\(?([a-zA-Z0-9_\-\.\/]+):(\d+):(\d+)\)?/i);
    if (match) {
      problems.push({
        id: `js-err-${idx}`,
        fileName: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: 'error',
        message: trimmed,
        raw: trimmed,
      });
      return;
    }
  });

  // Fallback: If no structured regex matched but errorText exists, create a single general problem entry
  if (problems.length === 0 && errorText.trim()) {
    const firstLine = errorText.trim().split('\n')[0];
    const lineMatch = errorText.match(/line\s*(\d+)/i);
    const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : 1;

    problems.push({
      id: 'generic-err-0',
      fileName: 'Source',
      line: lineNum,
      column: 1,
      severity: 'error',
      message: firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine,
      raw: errorText.trim(),
    });
  }

  return problems;
};

export function ProblemsTab({ result: rawResult, language, onSelectError }) {
  const result = normalizeExecutionResult(rawResult);
  const errorOutput = result ? (result.stderr || result.compileOutput || '') : '';

  const problems = useMemo(() => {
    return parseErrors(errorOutput, language);
  }, [errorOutput, language]);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-900 text-slate-500 font-mono text-xs space-y-2">
        <svg className="w-8 h-8 opacity-40 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.994-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p>No problems detected yet. Run your code to check for compilation or runtime issues.</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-900 text-slate-400 font-mono text-xs space-y-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
          ✓
        </div>
        <p className="text-emerald-400 font-semibold">No Problems Found</p>
        <p className="text-slate-500 text-[11px]">Your code compiled and executed cleanly without errors.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-900 text-slate-200 font-mono text-xs overflow-hidden select-text">
      {/* Problems Count Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-600 flex-shrink-0 text-[11px]">
        <span className="text-red-400 font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {problems.length} Problem{problems.length > 1 ? 's' : ''} Detected
        </span>
        <span className="text-slate-500 text-[10px]">Click any item to jump to code line</span>
      </div>

      {/* Error Item Cards List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {problems.map((prob) => (
          <button
            key={prob.id}
            onClick={() => onSelectError && onSelectError({ line: prob.line, column: prob.column })}
            className="w-full text-left p-3 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 hover:border-brand-500/50 transition-all flex flex-col gap-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                  prob.severity === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {prob.severity}
                </span>
                <span className="text-slate-300 font-semibold group-hover:text-brand-300 transition-colors">
                  {prob.fileName}
                </span>
              </div>
              <span className="text-brand-400 text-[11px] font-mono bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                Line {prob.line}, Col {prob.column}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed break-words">
              {prob.message}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
