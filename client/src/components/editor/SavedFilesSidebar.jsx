import { useState, useEffect, useCallback, useRef } from 'react';
import { historyService, sessionService } from '../../services/sessionService';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../../hooks/useToast';
import { Spinner } from '../ui/Spinner';
import { LocalFolderTree } from './LocalFolderTree';
import { CreateItemModal } from './CreateItemModal';
import {
  readLocalFile,
  getLanguageFromFileName,
  normalizeLanguage,
} from '../../services/fileSystem.service';

const LANG_BADGES = {
  javascript: { label: 'JS', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', ext: 'js' },
  python: { label: 'PY', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', ext: 'py' },
  cpp: { label: 'C++', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', ext: 'cpp' },
  java: { label: 'Java', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', ext: 'java' },
  typescript: { label: 'TS', bg: 'bg-blue-600/20 text-blue-300 border-blue-500/30', ext: 'ts' },
  html: { label: 'HTML', bg: 'bg-red-500/20 text-red-400 border-red-500/30', ext: 'html' },
  css: { label: 'CSS', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', ext: 'css' },
  json: { label: 'JSON', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', ext: 'json' },
  markdown: { label: 'MD', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', ext: 'md' },
};

export function SavedFilesSidebar({
  roomCode,
  isOpen,
  onToggle,
  onOpenSaveModal,
  refreshKey,
  onOpenLocalFolder,
  rootDirectoryHandle,
  localTreeNodes,
  activeLocalFile,
  setActiveLocalFile,
  refreshLocalTree,
}) {
  const { room, setCode, setLanguage, setVersion, emitCodeChange, switchFile, version, code } = useRoom();
  const { success, error: showError } = useToast();

  const [explorerTab, setExplorerTab] = useState('local'); // 'local' | 'room'
  const [files, setFiles] = useState([]);
  const [activeRoomFileId, setActiveRoomFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Modal creation state for Explorer Header + button
  const [headerModalState, setHeaderModalState] = useState({
    isOpen: false,
    type: 'file',
  });

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchSavedFiles = useCallback(async () => {
    if (!roomCode && !room?.roomCode) return;
    const targetRoomCode = roomCode || room?.roomCode;
    setLoading(true);
    try {
      const { data } = await historyService.list(targetRoomCode);
      setFiles(data.versions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roomCode, room]);

  useEffect(() => {
    fetchSavedFiles();
  }, [fetchSavedFiles, refreshKey]);

  // Handle New File Trigger from Explorer Header
  const handleHeaderCreateFile = () => {
    setShowAddMenu(false);
    setHeaderModalState({ isOpen: true, type: 'file' });
  };

  // Handle New Directory Trigger from Explorer Header
  const handleHeaderCreateDirectory = () => {
    setShowAddMenu(false);
    setHeaderModalState({ isOpen: true, type: 'folder' });
  };

  // Handle local file selection
  const handleSelectLocalFile = async (node) => {
    if (node.kind === 'directory') return;
    if (node.isBinary) {
      showError(`'${node.name}' is a binary file and cannot be opened in text editor.`);
      return;
    }

    try {
      const text = await readLocalFile(node.handle);
      const targetLang = normalizeLanguage(node.language || getLanguageFromFileName(node.name));
      const fileKey = node.relativePath || node.id || node.name;
      setActiveLocalFile(node);
      switchFile(fileKey, text, targetLang);
      success(`Opened local file: ${node.relativePath}`);
    } catch (err) {
      showError(`Failed to read file: ${err.message}`);
    }
  };

  // Import active local project to room history
  const handleImportToRoom = async () => {
    if (!activeLocalFile || !rootDirectoryHandle) {
      showError('Open a local project file first to import into the room');
      return;
    }
    try {
      await sessionService.save(roomCode || room?.roomCode, activeLocalFile.name || 'Imported File');
      fetchSavedFiles();
      success(`Imported '${activeLocalFile.name}' to Room Files! Collaborators can now access it.`);
    } catch (err) {
      showError('Failed to import file to room');
    }
  };

  const handleOpenFile = async (file) => {
    if (!file) return;

    const fileLabel = file.label || file.name || file._id || 'Saved File';
    const fileKey = file._id || fileLabel;
    const rawLang = getLanguageFromFileName(fileLabel) || file.language || 'javascript';
    const targetLang = normalizeLanguage(rawLang);

    // 1. Highlight file in sidebar
    if (file._id) setActiveRoomFileId(file._id);

    // 2. Determine initial code string
    const initialCode = file.code !== undefined && file.code !== null ? file.code : '';

    // 3. Switch file via RoomContext switchFile helper (preserves edits & updates Monaco)
    switchFile(fileKey, initialCode, targetLang);

    success(`Opened room file: ${fileLabel}`);

    // 4. Background fetch if code was not loaded on initial file object
    const activeCode = roomCode || room?.roomCode;
    if (activeCode && file._id && (file.code === undefined || file.code === null)) {
      try {
        const { data } = await historyService.get(activeCode, file._id);
        const v = data?.version || data?.data?.version;
        if (v && v.code !== undefined) {
          const freshLang = normalizeLanguage(getLanguageFromFileName(v.label || fileLabel) || v.language || targetLang);
          switchFile(fileKey, v.code || '', freshLang);
        }
      } catch (err) {
        // Fallback already active
      }
    }
  };

  const handleDownloadFile = (e, file) => {
    e.stopPropagation();
    const rawLang = getLanguageFromFileName(file.label || '') || file.language || 'javascript';
    const normLang = normalizeLanguage(rawLang);
    const langInfo = LANG_BADGES[normLang] || LANG_BADGES.javascript;
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
      {/* Explorer Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-600 bg-surface-800/80">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Explorer</span>
        </div>

        <div className="flex items-center gap-1 relative" ref={menuRef}>
          {/* Header New (+ Button) Dropdown */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
            title="Create New File or Folder"
            className="p-1 rounded hover:bg-surface-700 text-brand-400 hover:text-white transition-colors text-xs font-bold"
          >
            ➕
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-8 z-50 w-36 bg-surface-800 border border-surface-600 rounded-lg shadow-xl py-1 text-slate-200 text-xs font-mono">
              <button
                onClick={handleHeaderCreateFile}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>+📄</span> New File
              </button>
              <button
                onClick={handleHeaderCreateDirectory}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>+📁</span> New Folder
              </button>
            </div>
          )}

          <button
            onClick={onOpenLocalFolder}
            title="Open Local Folder / Project"
            className="p-1 rounded hover:bg-surface-700 text-slate-300 hover:text-white transition-colors text-xs font-bold"
          >
            📂 Open
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

      {/* Explorer Mode Tabs (Local Folder vs Room Files) */}
      <div className="flex items-center border-b border-surface-600 bg-surface-800 text-[11px] font-semibold">
        <button
          onClick={() => setExplorerTab('local')}
          className={`flex-1 py-1.5 text-center transition-colors ${
            explorerTab === 'local'
              ? 'text-brand-300 border-b-2 border-brand-400 bg-surface-700/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📂 Local Project {rootDirectoryHandle ? '✓' : ''}
        </button>
        <button
          onClick={() => setExplorerTab('room')}
          className={`flex-1 py-1.5 text-center transition-colors ${
            explorerTab === 'room'
              ? 'text-brand-300 border-b-2 border-brand-400 bg-surface-700/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ☁ Room Files ({files.length})
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto">
        {explorerTab === 'local' ? (
          rootDirectoryHandle ? (
            <LocalFolderTree
              rootHandle={rootDirectoryHandle}
              treeNodes={localTreeNodes}
              activeFile={activeLocalFile}
              onSelectFile={handleSelectLocalFile}
              onRefresh={refreshLocalTree}
              onImportToRoom={handleImportToRoom}
            />
          ) : (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-700/60 flex items-center justify-center mx-auto text-slate-400 text-xl">
                📂
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">No local project opened</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Open a folder from your computer to edit files locally.
                </p>
              </div>
              <button
                onClick={onOpenLocalFolder}
                className="btn-primary text-xs px-4 py-2 font-semibold"
              >
                📂 Open Local Project
              </button>
            </div>
          )
        ) : (
          /* Room Saved Files List */
          <div className="p-2 space-y-1">
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
                <p className="text-xs text-slate-400 font-medium">No room files saved yet</p>
                <p className="text-[11px] text-slate-500 mt-1">Click ➕ to create a file or press Ctrl+S</p>
              </div>
            ) : (
              files.map((file) => {
                const rawLang = getLanguageFromFileName(file.label || '') || file.language || 'javascript';
                const normLang = normalizeLanguage(rawLang);
                const lang = LANG_BADGES[normLang] || LANG_BADGES.javascript;
                const fileName = file.label || `file_${file._id.slice(-4)}.${lang.ext}`;
                const timeAgo = new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isActive = activeRoomFileId === file._id;

                return (
                  <div
                    key={file._id}
                    onClick={() => handleOpenFile(file)}
                    className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer text-xs ${
                      isActive
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 font-semibold'
                        : 'hover:bg-surface-700/80 border-transparent hover:border-surface-600'
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${lang.bg}`}>
                      {lang.label}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-medium text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                        {fileName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {file.savedBy?.name ? file.savedBy.name.split(' ')[0] : 'User'} • {timeAgo}
                      </p>
                    </div>

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
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-surface-600 bg-surface-800/50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>{explorerTab === 'local' ? (rootDirectoryHandle ? 'Local Active' : 'No Local Folder') : `${files.length} Room File(s)`}</span>
        <button
          onClick={onOpenSaveModal}
          className="text-brand-400 hover:text-brand-300 font-medium hover:underline"
        >
          Save As...
        </button>
      </div>

      {/* Create Item Modal for Explorer Header Action */}
      <CreateItemModal
        isOpen={headerModalState.isOpen}
        onClose={() => setHeaderModalState({ ...headerModalState, isOpen: false })}
        type={headerModalState.type}
        mode={explorerTab}
        roomCode={roomCode || room?.roomCode}
        targetDirHandle={rootDirectoryHandle}
        rootHandle={rootDirectoryHandle}
        existingRoomFiles={files}
        onRefreshLocal={refreshLocalTree}
        onRefreshRoomFiles={fetchSavedFiles}
        onSelectLocalFile={handleSelectLocalFile}
      />
    </div>
  );
}
