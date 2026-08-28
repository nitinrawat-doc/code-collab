/**
 * components/room/InviteModal.jsx
 *
 * Generates a secure invite token via the backend, shows:
 *  1. The public HTTPS tunnel URL (works from any device, any network)
 *  2. The room code as a fallback (for LAN/direct join)
 *
 * The invite URL uses serveo.net — no password page, no captcha.
 * Friends can open it directly, register/login, then click Accept.
 */
import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { roomService } from '../../services/roomService';
import api from '../../services/api';

export function InviteModal({ isOpen, onClose, roomCode }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [genError, setGenError] = useState('');

  const [tunnelUrl, setTunnelUrl] = useState('');
  const [tunnelChecking, setTunnelChecking] = useState(false);

  // On open: reset state and check tunnel status
  useEffect(() => {
    if (!isOpen) return;
    setInviteUrl('');
    setGenError('');
    setCopiedLink(false);
    checkTunnel();
  }, [isOpen, roomCode]);

  const checkTunnel = async () => {
    setTunnelChecking(true);
    try {
      const { data } = await api.get('/network-info');
      setTunnelUrl(data.publicTunnelUrl || '');
    } catch {
      setTunnelUrl('');
    } finally {
      setTunnelChecking(false);
    }
  };

  const generateLink = async () => {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    try {
      const { data } = await roomService.generateInvite(roomCode);
      setInviteUrl(data.invite.inviteUrl);
    } catch (err) {
      setGenError(err.response?.data?.message || 'Failed to generate invite link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const isTunnelReady = !!tunnelUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Collaborators">
      <div className="space-y-5">

        {/* Tunnel status bar */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
          tunnelChecking
            ? 'bg-surface-700 border-surface-600 text-slate-400'
            : isTunnelReady
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            tunnelChecking ? 'bg-slate-500 animate-pulse' :
            isTunnelReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`} />
          {tunnelChecking
            ? 'Checking tunnel status…'
            : isTunnelReady
              ? `Public tunnel active — link works on any device`
              : 'Tunnel not connected yet — link may only work on this network'}
          {!tunnelChecking && !isTunnelReady && (
            <button
              onClick={checkTunnel}
              className="ml-auto underline text-amber-400 hover:text-amber-300 text-[10px]"
            >
              Retry
            </button>
          )}
        </div>

        <p className="text-sm text-slate-400">
          Generate a secure invite link. Your friend opens the link, creates an account (or logs in), and joins instantly.
        </p>

        {/* ── Invite Link Section ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-brand-400 font-bold">
              🔗 Invite Link
            </label>
            {isTunnelReady && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                ✓ Shareable Anywhere
              </span>
            )}
          </div>

          {inviteUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  id="invite-link"
                  className="input flex-1 text-slate-200 text-xs font-mono bg-surface-900 border border-surface-600"
                  value={inviteUrl}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyLink}
                  type="button"
                  className={`btn text-xs font-semibold px-4 py-2.5 transition-all shadow-sm flex-shrink-0 ${
                    copiedLink ? 'bg-emerald-600 text-white' : 'btn-primary'
                  }`}
                >
                  {copiedLink ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Expires in 7 days · Anyone with this link must log in or register first
              </p>
              <button
                onClick={generateLink}
                type="button"
                className="text-[11px] text-brand-400 hover:text-brand-300 underline w-full text-center"
              >
                Generate a new link
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={generateLink}
                disabled={generating}
                type="button"
                id="generate-invite-btn"
                className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  '🔗 Generate Invite Link'
                )}
              </button>
              {genError && (
                <p className="text-xs text-red-400 text-center">{genError}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Room Code Fallback ── */}
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-600 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Room Code (fallback)
            </label>
            <span className="text-[10px] text-slate-500">Same Wi-Fi / Hotspot only</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl tracking-[0.3em] font-bold text-white flex-1 text-center bg-surface-800 py-2 rounded-lg border border-surface-600">
              {roomCode}
            </div>
            <button
              onClick={copyCode}
              type="button"
              className={`btn text-xs font-semibold px-4 py-3 flex-shrink-0 ${
                copiedCode ? 'bg-emerald-600 text-white' : 'btn-secondary'
              }`}
            >
              {copiedCode ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center pt-1">
            Friends on the same Wi-Fi/Hotspot: Dashboard → <strong className="text-white">Join Room</strong> → enter <strong className="font-mono text-brand-300">{roomCode}</strong>
          </p>
        </div>

        <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 text-[11px] text-slate-400">
          🔒 Private Room · Up to 10 members · All code edits sync in real-time
        </div>
      </div>
    </Modal>
  );
}
