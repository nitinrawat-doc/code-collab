import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import api from '../../services/api';

export function InviteModal({ isOpen, onClose, roomCode }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [networkIp, setNetworkIp] = useState('');

  const currentPort = window.location.port || '5173';
  const protocol = window.location.protocol;

  // Auto-detect real Network IP address from backend
  useEffect(() => {
    if (isOpen) {
      api.get('/network-info')
        .then(({ data }) => {
          if (data.localIp && data.localIp !== 'localhost' && data.localIp !== '127.0.0.1') {
            setNetworkIp(data.localIp);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Construct non-localhost invite URL using Network IP
  const currentHost = window.location.hostname;
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
  
  const hostToUse = isLocalhost && networkIp ? `${networkIp}:${currentPort}` : window.location.host;
  const inviteUrl = `${protocol}//${hostToUse}/join/${roomCode}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Collaborators">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">
          Share this invite link or room code with any friend to collaborate in real-time.
        </p>

        {/* Universal Direct Invite Link (Network IP based) */}
        <div className="space-y-2">
          <label className="label text-xs uppercase tracking-wider text-brand-400 font-bold">
            Invite Link
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              className="input flex-1 text-slate-200 text-xs font-mono bg-surface-900 border border-surface-600"
              value={inviteUrl}
              id="invite-link"
            />
            <button
              onClick={copyLink}
              className={`btn text-xs font-semibold px-4 py-2.5 transition-all shadow-sm ${
                copiedLink ? 'bg-emerald-600 text-white' : 'btn-primary'
              }`}
            >
              {copiedLink ? '✓ Link Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Room Code Card */}
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-600 space-y-2">
          <div className="flex items-center justify-between">
            <label className="label text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Or Share Room Code
            </label>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl tracking-[0.3em] font-bold text-white flex-1 text-center bg-surface-800 py-2 rounded-lg border border-surface-600">
              {roomCode}
            </div>
            <button
              onClick={copyCode}
              className={`btn text-xs font-semibold px-4 py-3 ${
                copiedCode ? 'bg-emerald-600 text-white' : 'btn-secondary'
              }`}
            >
              {copiedCode ? '✓ Code Copied' : 'Copy Code'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center pt-1">
            Friends can also click <strong className="text-white">"Join Room"</strong> on Dashboard and enter code <strong className="font-mono text-brand-300">{roomCode}</strong>.
          </p>
        </div>

        <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 text-[11px] text-slate-400">
          🔒 Private Room • Up to 5 members can join and edit simultaneously.
        </div>
      </div>
    </Modal>
  );
}
