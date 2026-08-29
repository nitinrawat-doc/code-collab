/**
 * components/editor/OutputTab.jsx
 *
 * Displays program execution output:
 *  - Standard Output (stdout)
 *  - Standard Error (stderr) & Compilation logs
 *  - Execution Time & Memory stats
 *  - Exit status & status badge
 */

import { useState } from 'react';
import { Spinner } from '../ui/Spinner';

export function OutputTab({ result, loading }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = (result?.stdout || '') + (result?.stderr ? `\n\n[ERRORS]\n${result.stderr}` : '');
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-900 text-slate-400 space-y-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono">Executing code in sandboxed environment...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-900 text-slate-500 font-mono text-xs space-y-2">
        <svg className="w-8 h-8 opacity-40 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No execution output yet. Click <span className="text-brand-400 font-semibold">▶ Run</span> to execute your program.</p>
      </div>
    );
  }

  const isSuccess = result.status === 'Accepted' || result.passed;

  return (
    <div className="flex flex-col h-full bg-surface-900 text-slate-200 font-mono text-xs overflow-hidden select-text">
      {/* Header Info Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-600 flex-shrink-0 text-[11px]">
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase tracking-wider ${
            isSuccess
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}>
            {result.status || (isSuccess ? 'Success' : 'Error')}
          </span>

          {/* Execution Time */}
          {result.time && (
            <span className="text-slate-400">
              ⏱ Time: <strong className="text-slate-200">{result.time}s</strong>
            </span>
          )}

          {/* Memory */}
          {result.memory && (
            <span className="text-slate-400">
              💾 Memory: <strong className="text-slate-200">{result.memory} KB</strong>
            </span>
          )}
        </div>

        {/* Copy Output Button */}
        <button
          onClick={handleCopy}
          className="px-2.5 py-1 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 transition-colors text-[10px]"
        >
          {copied ? '✓ Copied' : 'Copy Output'}
        </button>
      </div>

      {/* Output Content Scroll Region */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Standard Output Section */}
        {result.stdout && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Standard Output (stdout)</h4>
            <pre className="p-3 rounded-lg bg-surface-800 border border-surface-700 text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
              {result.stdout}
            </pre>
          </div>
        )}

        {/* Standard Error / Compilation Output Section */}
        {(result.stderr || result.compileOutput) && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-400">Standard Error (stderr / compiler)</h4>
            <pre className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 whitespace-pre-wrap break-words leading-relaxed">
              {result.stderr || result.compileOutput}
            </pre>
          </div>
        )}

        {/* If no stdout or stderr but execution completed */}
        {!result.stdout && !result.stderr && !result.compileOutput && (
          <div className="p-3 rounded-lg bg-surface-800 border border-surface-700 text-slate-400 italic text-center">
            [Program executed successfully with no output]
          </div>
        )}
      </div>
    </div>
  );
}
