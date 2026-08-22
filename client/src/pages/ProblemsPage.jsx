import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemService } from '../services/problemService';
import { Spinner } from '../components/ui/Spinner';

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await problemService.list({ difficulty: difficulty || undefined, search: filter || undefined });
        setProblems(data.problems);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter, difficulty]);

  const badgeClass = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' };

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-600 bg-surface-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="btn-ghost text-sm">← Dashboard</Link>
          <h1 className="text-lg font-semibold text-white">Problem Library</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <input
            className="input flex-1"
            placeholder="Search problems..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            className="input w-36"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-2">
            {problems.map((p, i) => (
              <div key={p._id} className="card hover:border-brand-500/40 transition-all flex items-center gap-4">
                <span className="text-slate-600 text-sm w-6 flex-shrink-0">{i + 1}</span>
                <span className={badgeClass[p.difficulty]}>{p.difficulty}</span>
                <span className="text-slate-200 font-medium flex-1">{p.title}</span>
                <div className="flex gap-1 flex-wrap">
                  {p.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="badge bg-surface-700 text-slate-400 border border-surface-500 text-[10px]">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
            {problems.length === 0 && (
              <div className="text-center py-20 text-slate-500">No problems found.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
