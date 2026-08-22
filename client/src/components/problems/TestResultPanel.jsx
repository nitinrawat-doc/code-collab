export function TestResultPanel({ result, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 gap-3">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Running code...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Run your code to see results here.
      </div>
    );
  }

  // Single run mode (no test cases)
  if (result.mode === 'run') {
    const r = result.result;
    return (
      <div className="p-4 font-mono text-xs space-y-3">
        <div className={`text-sm font-semibold ${r.passed || r.statusId === 3 ? 'text-green-400' : 'text-red-400'}`}>
          {r.status}
        </div>
        {r.stdout && (
          <div>
            <p className="text-slate-500 mb-1">Output:</p>
            <pre className="bg-surface-900 p-3 rounded-lg text-slate-300 overflow-auto max-h-48 whitespace-pre-wrap">{r.stdout}</pre>
          </div>
        )}
        {r.stderr && (
          <div>
            <p className="text-red-400 mb-1">Error:</p>
            <pre className="bg-red-950/30 border border-red-900/50 p-3 rounded-lg text-red-300 overflow-auto max-h-32 whitespace-pre-wrap">{r.stderr}</pre>
          </div>
        )}
        {r.compileOutput && (
          <div>
            <p className="text-orange-400 mb-1">Compilation:</p>
            <pre className="bg-orange-950/30 border border-orange-900/50 p-3 rounded-lg text-orange-300 overflow-auto max-h-32 whitespace-pre-wrap">{r.compileOutput}</pre>
          </div>
        )}
        {r.time && <p className="text-slate-500">⏱ {r.time}s</p>}
      </div>
    );
  }

  // Test case mode
  return (
    <div className="p-4 space-y-4">
      <div className={`flex items-center gap-2 ${result.allPassed ? 'text-green-400' : 'text-red-400'}`}>
        <span className="text-xl">{result.allPassed ? '✓' : '✗'}</span>
        <span className="font-semibold">{result.overallStatus}</span>
        <span className="text-slate-500 text-sm ml-auto">
          {result.results?.filter((r) => r.passed).length}/{result.results?.length} passed
        </span>
      </div>

      <div className="space-y-2">
        {result.results?.map((r, i) => (
          <div key={i} className={`p-3 rounded-lg border text-xs font-mono ${
            r.passed
              ? 'bg-green-950/20 border-green-800/40'
              : 'bg-red-950/20 border-red-800/40'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                {r.passed ? '✓' : '✗'} Test {r.testCase}
              </span>
              <span className="text-slate-500">{r.status}</span>
            </div>
            {!r.passed && r.input !== '[hidden]' && (
              <div className="space-y-1 text-slate-400">
                <p><span className="text-slate-500">Input: </span>{r.input}</p>
                <p><span className="text-slate-500">Expected: </span><span className="text-green-400">{r.expectedOutput}</span></p>
                <p><span className="text-slate-500">Got: </span><span className="text-red-400">{r.stdout || r.stderr || 'no output'}</span></p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
