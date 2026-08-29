export function ProblemPanel({ problem, onOpenProblemPicker }) {
  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <p className="text-slate-300 font-medium">No problem selected</p>
          <p className="text-slate-500 text-xs mt-1">Select a problem from the library to load starter code & problem statement.</p>
        </div>
        {onOpenProblemPicker && (
          <button
            onClick={onOpenProblemPicker}
            className="btn-primary text-xs px-4 py-2"
          >
            📚 Browse Problems Library
          </button>
        )}
      </div>
    );
  }

  const difficultyClass = {
    Easy: 'badge-easy',
    Medium: 'badge-medium',
    Hard: 'badge-hard',
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 select-text">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={difficultyClass[problem.difficulty]}>{problem.difficulty}</span>
            {problem.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-surface-700 text-slate-400 border border-surface-500">{tag}</span>
            ))}
          </div>
          {onOpenProblemPicker && (
            <button
              onClick={onOpenProblemPicker}
              className="text-xs text-brand-400 hover:text-brand-300 underline font-medium"
            >
              Change Problem
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold text-white">{problem.title}</h2>
      </div>

      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {problem.description}
      </div>

      {problem.examples?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Examples</h3>
          <div className="space-y-3">
            {problem.examples.map((ex, i) => (
              <div key={i} className="bg-surface-900 rounded-lg p-3 border border-surface-600">
                <p className="text-xs text-slate-500 mb-2">Example {i + 1}</p>
                <div className="font-mono text-xs space-y-1">
                  <p><span className="text-slate-500">Input: </span><span className="text-slate-200">{ex.input}</span></p>
                  <p><span className="text-slate-500">Output: </span><span className="text-green-400">{ex.output}</span></p>
                  {ex.explanation && (
                    <p><span className="text-slate-500">Explanation: </span><span className="text-slate-400">{ex.explanation}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {problem.constraints && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Constraints</h3>
          <div className="bg-surface-900 rounded-lg p-3 border border-surface-600 font-mono text-xs text-slate-400 whitespace-pre-wrap">
            {problem.constraints}
          </div>
        </div>
      )}
    </div>
  );
}
