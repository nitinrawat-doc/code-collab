import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../hooks/useToast';

const EXT_MAP = {
  javascript: 'js',
  python: 'py',
  cpp: 'cpp',
  java: 'java',
};

export function SaveFileModal({ isOpen, onClose, roomCode, currentLanguage, problemTitle, onSaveSuccess }) {
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (isOpen) {
      const ext = EXT_MAP[currentLanguage] || 'js';
      const cleanProblemName = problemTitle
        ? problemTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')
        : 'solution';
      setFileName(`${cleanProblemName}.${ext}`);
    }
  }, [isOpen, currentLanguage, problemTitle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setSaving(true);
    try {
      await sessionService.save(roomCode, fileName.trim());
      success(`File saved as "${fileName.trim()}"!`);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save File (Ctrl+S)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="save-file-name">
            File Name
          </label>
          <div className="relative">
            <input
              id="save-file-name"
              type="text"
              className="input font-mono pr-20"
              placeholder="e.g. solution.js"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              required
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 uppercase">
              {EXT_MAP[currentLanguage] || 'JS'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Specify a custom name for your saved file or version snapshot.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFileName(`main.${EXT_MAP[currentLanguage] || 'js'}`)}
            className="px-2.5 py-1 text-xs font-mono rounded bg-surface-700 hover:bg-surface-600 text-slate-300 border border-surface-600 transition-colors"
          >
            Use default (main.{EXT_MAP[currentLanguage] || 'js'})
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Save File'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
