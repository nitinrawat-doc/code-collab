import { useState, useEffect, useCallback } from 'react';
import { historyService } from '../../services/sessionService';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../../hooks/useToast';
import { Spinner } from '../ui/Spinner';

const LANG_BADGES = {
  javascript: { label: 'JS', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', ext: 'js' },
  python: { label: 'PY', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', ext: 'py' },
  cpp: { label: 'C++', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', ext: 'cpp' },
  java: { label: 'Java', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', ext: 'java' },
};

export function SavedFilesSidebar({ roomCode, isOpen, onToggle, onOpenSaveModal, refreshKey }) {
  const { setCode, setLanguage, setVersion, emitCodeChange, version } = useRoom();
  const { success, error: showError } = useToast();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedFiles = useCallback(async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      const { data } = await historyService.list(roomCode);
      setFiles(data.versions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    fetchSavedFiles();
  }, [fetchSavedFiles, refreshKey]);

  const handleOpenFile = async (file) => {
    try {
      const { data } = await historyService.get(roomCode, file._id);
      const v = data.version;
      if (!v) return;

      const newVer = version + 1;
      setCode(v.code);
      setLanguage(v.language);
      setVersion(newVer);
      emitCodeChange(roomCode, v.code, v.language, newVer);

      success(`Opened file: ${v.label || 'Saved File'}`);
    } catch {
      showError('Failed to open saved file');
    }
  };

  const handleDownloadFile = (e, file) => {
    e.stopPropagation();
    const langInfo = LANG_BADGES[file.language] || LANG_BADGES.javascript;
    const defaultName = `file_${file._id.slice(-4)}.${langInfo.ext}`;
    const fileName = file.label
      ? file.label.includes('.')
        ? file.label
        : `${file.label}.${langInfo.ext}`
      : defaultName;

    const blob = new Blob([file.code || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Downloaded ${fileName}`);
  };

  if (!isOpen) return null;

  return (
    <div className="w-64 flex flex-col border-r border-surface-600 bg-surface-850 flex-shrink-0 select-none">
      {/* Explorer Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-600 bg-surface-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Explorer / Files</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSaveModal}
            title="Save New File As... (Ctrl+S)"
            className="p-1 rounded hover:bg-surface-700 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            title="Close Explorer"
            className="p-1 rounded hover:bg-surface-700 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 px-3">
            <div className="w-10 h-10 rounded-xl bg-surface-700/50 flex items-center justify-center mx-auto mb-2 text-slate-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-slate-400 font-medium">No saved files yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Press Ctrl+S or click + to save a file</p>
          </div>
        ) : (
          files.map((file) => {
            const lang = LANG_BADGES[file.language] || LANG_BADGES.javascript;
            const fileName = file.label || `file_${file._id.slice(-4)}.${lang.ext}`;
            const timeAgo = new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={file._id}
                onClick={() => handleOpenFile(file)}
                className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-surface-700/80 border border-transparent hover:border-surface-600 transition-all cursor-pointer"
              >
                {/* Language Badge */}
                <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${lang.bg}`}>
                  {lang.label}
                </span>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-medium text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                    {fileName}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {file.savedBy?.name ? file.savedBy.name.split(' ')[0] : 'User'} • {timeAgo}
                  </p>
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => handleDownloadFile(e, file)}
                  title="Download File"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-600 text-slate-400 hover:text-cyan-400 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-surface-600 bg-surface-800/50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>{files.length} saved file(s)</span>
        <button
          onClick={onOpenSaveModal}
          className="text-brand-400 hover:text-brand-300 font-medium hover:underline"
        >
          Save As...
        </button>
      </div>
    </div>
  );
}
