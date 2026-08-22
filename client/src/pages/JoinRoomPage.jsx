import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { roomService } from '../services/roomService';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';

export default function JoinRoomPage() {
  const { roomCode: paramCode } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [inputCode, setInputCode] = useState(paramCode ? paramCode.toUpperCase() : '');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) return;

    setJoining(true);
    setError(null);
    try {
      try {
        await roomService.join(code);
      } catch (err) {
        // 409 means already a member — proceed to room
        if (err.response?.status !== 409) throw err;
      }
      navigate(`/room/${code}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid room key or room does not exist';
      setError(msg);
    } finally {
      setJoining(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    const targetCode = inputCode.trim().toUpperCase() || paramCode || '';
    const redirectUrl = targetCode ? `/join/${targetCode}` : '/dashboard';
    navigate(`/signup?redirect=${encodeURIComponent(redirectUrl)}`);
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 border border-surface-600 bg-surface-800 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-3 border border-brand-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Join Private DSA Room</h2>
          <p className="text-sm text-slate-400">
            Enter the 8-character Room Key provided by your host to join.
          </p>
        </div>

        {/* Current User & Switch Account option */}
        {user && (
          <div className="p-3 bg-surface-900 border border-surface-700 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="truncate text-slate-300">
              <span className="text-slate-500">Logged in as: </span>
              <strong className="text-white">{user.name}</strong>
            </div>
            <button
              onClick={handleSwitchAccount}
              type="button"
              className="text-brand-400 hover:text-brand-300 font-semibold underline text-xs transition-colors flex-shrink-0"
            >
              + Register New Friend
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Room Key Verification Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="label" htmlFor="room-code-input">
              Room Key / Code
            </label>
            <input
              id="room-code-input"
              type="text"
              className="input text-center text-lg font-mono tracking-[0.25em] font-bold text-brand-400 uppercase bg-surface-900"
              placeholder="e.g. F3XA7FMG"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={8}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-sm font-semibold shadow-md active:scale-95 transition-all"
            disabled={joining || !inputCode.trim()}
          >
            {joining ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Verifying Room Key...
              </span>
            ) : (
              'Verify & Join Room'
            )}
          </button>
        </form>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between text-xs">
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-200 hover:underline">
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleSwitchAccount}
            className="text-slate-400 hover:text-brand-400 hover:underline"
          >
            Sign out & Join as another user
          </button>
        </div>
      </div>
    </div>
  );
}
