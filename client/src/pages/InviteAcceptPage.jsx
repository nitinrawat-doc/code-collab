/**
 * pages/InviteAcceptPage.jsx
 *
 * Handles the full /invite/:token flow:
 *   1. Load invite details from the public peek endpoint (no auth needed)
 *   2. If not authenticated → show Login/Signup tabs so the user can authenticate
 *   3. Once authenticated → show Accept button
 *   4. On Accept → call acceptInvite, then navigate to /room/:roomCode
 *
 * This page is NOT wrapped in ProtectedRoute — guests can land here.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomService } from '../services/roomService';
import { Spinner } from '../components/ui/Spinner';
import { SignupForm } from '../components/auth/SignupForm';
import { LoginForm } from '../components/auth/LoginForm';

// ─── Invite Info Card ─────────────────────────────────────────────────────────

function InviteInfoCard({ invite }) {
  return (
    <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-slate-400">You've been invited to join</p>
          <p className="text-base font-bold text-white">{invite.roomName}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-surface-900 rounded-lg px-3 py-2 border border-surface-700">
          <span className="text-slate-400">Invited by</span>
          <p className="text-white font-semibold mt-0.5">{invite.invitedBy}</p>
        </div>
        <div className="bg-surface-900 rounded-lg px-3 py-2 border border-surface-700">
          <span className="text-slate-400">Members</span>
          <p className="text-white font-semibold mt-0.5">{invite.memberCount} / {invite.maxMembers}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [peekLoading, setPeekLoading] = useState(true);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  const [authTab, setAuthTab] = useState('signup'); // 'login' | 'signup'

  // ── Step 1: Peek invite details ───────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setPeekLoading(true);
    roomService
      .peekInvite(token)
      .then(({ data }) => {
        setInvite(data.invite);
        setLoadError(null);
      })
      .catch((err) => {
        const data = err.response?.data;
        setLoadError(data?.message || 'This invite link is invalid or has expired.');
      })
      .finally(() => setPeekLoading(false));
  }, [token]);

  // ── Step 2: If already authenticated AND invite loaded, auto-show accept ──
  // (handled in render)

  // ── Step 3: Accept invite ─────────────────────────────────────────────
  const handleAccept = async () => {
    if (!isAuthenticated || !token) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const { data } = await roomService.acceptInvite(token);
      navigate(`/room/${data.roomCode}`, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join room. Please try again.';
      setAcceptError(msg);
    } finally {
      setAccepting(false);
    }
  };

  // ── Loading states ─────────────────────────────────────────────────────
  if (authLoading || peekLoading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner size="lg" />
          <p className="text-slate-400 text-sm">Loading invite details…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired / revoked invite ────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 border border-surface-600 bg-surface-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.994-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Invite Link Invalid</h2>
          <p className="text-sm text-slate-400">{loadError}</p>
          <Link to="/dashboard" className="btn-primary inline-block px-6 py-2.5 text-sm">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">CodeCollab</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Room Invite</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isAuthenticated
              ? `Logged in as ${user?.name} — ready to join!`
              : 'Create an account or log in to accept this invite'}
          </p>
        </div>

        {/* Invite info card */}
        {invite && <InviteInfoCard invite={invite} />}

        {/* ── AUTHENTICATED: show accept button ── */}
        {isAuthenticated ? (
          <div className="card p-6 border border-surface-600 bg-surface-800 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-900 border border-surface-700 rounded-xl text-sm">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{user?.name}</p>
                <p className="text-slate-400 text-xs">{user?.email}</p>
              </div>
            </div>

            {acceptError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 text-center">
                {acceptError}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="btn-primary w-full py-3 text-sm font-semibold shadow-md active:scale-95 transition-all"
              id="accept-invite-btn"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> Joining Room…
                </span>
              ) : (
                `✓ Accept Invite & Join "${invite?.roomName}"`
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              Not you?{' '}
              <Link to={`/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`} className="text-brand-400 hover:underline">
                Use a different account
              </Link>
            </p>
          </div>
        ) : (
          /* ── NOT AUTHENTICATED: login/signup tabs ── */
          <div className="card p-6 border border-surface-600 bg-surface-800 space-y-5">
            {/* Tabs */}
            <div className="flex rounded-lg overflow-hidden border border-surface-600">
              <button
                onClick={() => setAuthTab('signup')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  authTab === 'signup'
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-700 text-slate-400 hover:text-white'
                }`}
                id="invite-signup-tab"
              >
                Create Account
              </button>
              <button
                onClick={() => setAuthTab('login')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  authTab === 'login'
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-700 text-slate-400 hover:text-white'
                }`}
                id="invite-login-tab"
              >
                Log In
              </button>
            </div>

            {/* Auth form — after login/register, AuthContext updates user
                The component re-renders and shows the accept button above */}
            {authTab === 'signup' ? (
              <SignupForm redirectAfter={`/invite/${token}`} />
            ) : (
              <LoginForm redirectAfter={`/invite/${token}`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
