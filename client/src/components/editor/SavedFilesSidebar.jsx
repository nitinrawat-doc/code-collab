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
  javascript: { label: 'JS',   bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', ext: 'js' },
  python:     { label: 'PY',   bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       ext: 'py' },
  cpp:        { label: 'C++',  bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',       ext: 'cpp' },
  java:       { label: 'Java', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', ext: 'java' },
  typescript: { label: 'TS',   bg: 'bg-blue-600/20 text-blue-300 border-blue-500/30',       ext: 'ts' },
  html:       { label: 'HTML', bg: 'bg-red-500/20 text-red-400 border-red-500/30',          ext: 'html' },
  css:        { label: 'CSS',  bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', ext: 'css' },
  json:       { label: 'JSON', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',    ext: 'json' },
  markdown:   { label: 'MD',   bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', ext: 'md' },
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
  const { room, switchFile } = useRoom();
  const { success, error: showError } = useToast();

  // Room files state
  const [roomFiles, setRoomFiles] = useState([]);
  const [activeRoomFileId, setActiveRoomFileId] = useState(null);
  const [roomFilesLoading, setRoomFilesLoading] = useState(false);

  // Local section collapsed state
  const [localSectionOpen, setLocalSectionOpen] = useState(true);

  // Dropdown menus
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuOpenFileId, setMenuOpenFileId] = useState(null);

  // Create item modal state
  const [createModal, setCreateModal] = useState({ isOpen: false, type: 'file', mode: 'room' });

  const menuRef = useRef(null);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
      setMenuOpenFileId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // ── Fetch room files ───────────────────────────────────────────────────────
  const fetchRoomFiles = useCallback(async () => {
    const rc = roomCode || room?.roomCode;
    if (!rc) return;
    setRoomFilesLoading(true);
    try {
      const { data } = await historyService.list(rc);
      setRoomFiles(data.versions || []);
    } catch {
      // ignore
    } finally {
      setRoomFilesLoading(false);
    }
  }, [roomCode, room]);

  useEffect(() => {
    fetchRoomFiles();
  }, [fetchRoomFiles, refreshKey]);

  // ── Create button handler ──────────────────────────────────────────────────
  // Smart context: create in local folder if one is open, otherwise room file
  const handleCreateFile = () => {
    setShowAddMenu(false);
    const mode = rootDirectoryHandle ? 'local' : 'room';
    setCreateModal({ isOpen: true, type: 'file', mode });
  };

  const handleCreateFolder = () => {
    setShowAddMenu(false);
    const mode = rootDirectoryHandle ? 'local' : 'room';
    setCreateModal({ isOpen: true, type: 'folder', mode });
  };

  // ── Local file selection ───────────────────────────────────────────────────
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
      // Clear room file active highlight when opening a local file
      setActiveRoomFileId(null);
      switchFile(fileKey, text, targetLang);
      success(`Opened: ${node.relativePath}`);
    } catch (err) {
      showError(`Failed to read file: ${err.message}`);
    }
  };

  // Import local file to room history
  const handleImportToRoom = async () => {
    if (!activeLocalFile || !rootDirectoryHandle) {
      showError('Open a local project file first to import into the room');
      return;
    }
    try {
      await sessionService.save(roomCode || room?.roomCode, activeLocalFile.name || 'Imported File');
      fetchRoomFiles();
      success(`Imported '${activeLocalFile.name}' to Room Files!`);
    } catch {
      showError('Failed to import file to room');
    }
  };

  // ── Room file selection ────────────────────────────────────────────────────
  const handleOpenRoomFile = async (file) => {
    if (!file) return;

    const fileLabel = file.label || file.name || file._id || 'Saved File';
    // KEY FIX: use fileLabel (filename) as the cache key — same key CreateItemModal uses
    // when it calls switchFile(cleanName, ...). Using MongoDB _id here caused a cache miss
    // because the in-memory fileContentMapRef was stored under the filename, not the _id.
    const fileKey = fileLabel;
    const rawLang = getLanguageFromFileName(fileLabel) || file.language || 'javascript';
    const targetLang = normalizeLanguage(rawLang);

    if (file._id) setActiveRoomFileId(file._id);
    // Clear local file active highlight when opening a room file
    setActiveLocalFile(null);

    const initialCode = file.code !== undefined && file.code !== null ? file.code : '';
    switchFile(fileKey, initialCode, targetLang);
    success(`Opened: ${fileLabel}`);

    // Background fetch ONLY if the list response had no code AND the cache also missed
    // (i.e. truly no content available at all — new file never typed in).
    const rc = roomCode || room?.roomCode;
    if (rc && file._id && (file.code === undefined || file.code === null)) {
      try {
        const { data } = await historyService.get(rc, file._id);
        const v = data?.version || data?.data?.version;
        if (v && v.code !== undefined) {
          const freshLang = normalizeLanguage(getLanguageFromFileName(v.label || fileLabel) || v.language || targetLang);
          // Only call switchFile if the cache still doesn't have this file's content
          // (don't override user's typed code that was loaded from cache)
          switchFile(fileKey, v.code || '', freshLang);
        }
      } catch {
        // fallback already active — cache or initialCode is sufficient
      }
    }
  };

  // ── Room file delete ───────────────────────────────────────────────────────
  const handleDeleteRoomFile = async (e, file) => {
    if (e) e.stopPropagation();
    const fileName = file.label || `file_${file._id.slice(-4)}`;
    if (!window.confirm(`Delete '${fileName}'?`)) return;
    try {
      const rc = roomCode || room?.roomCode;
      await historyService.delete(rc, file._id);
      success(`Deleted: ${fileName}`);
      if (activeRoomFileId === file._id) setActiveRoomFileId(null);
      fetchRoomFiles();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to delete file');
    }
  };

  // ── Room file download ─────────────────────────────────────────────────────
  const handleDownloadFile = (e, file) => {
    if (e) e.stopPropagation();
    const rawLang = getLanguageFromFileName(file.label || '') || file.language || 'javascript';
    const normLang = normalizeLanguage(rawLang);
    const langInfo = LANG_BADGES[normLang] || LANG_BADGES.javascript;
    const defaultName = `file_${file._id.slice(-4)}.${langInfo.ext}`;
    const fileName = file.label
      ? file.label.includes('.') ? file.label : `${file.label}.${langInfo.ext}`
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
    <div className="w-64 flex flex-col border-r border-surface-600 bg-surface-850 flex-shrink-0 select-none overflow-hidden">

      {/* ── Explorer Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-600 bg-surface-800/80 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Explorer</span>
        </div>

        <div className="flex items-center gap-1 relative" ref={menuRef}>
          {/* + New File/Folder dropdown */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
            title="New File or Folder"
            className="p-1 rounded hover:bg-surface-700 text-brand-400 hover:text-white transition-colors text-sm font-bold"
          >
            +
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-8 z-50 w-40 bg-surface-800 border border-surface-600 rounded-lg shadow-xl py-1 text-slate-200 text-xs font-mono">
              <button
                onClick={handleCreateFile}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>📄</span> New File
              </button>
              <button
                onClick={handleCreateFolder}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>📁</span> New Folder
              </button>
            </div>
          )}

          {/* Open Local Folder */}
          <button
            onClick={onOpenLocalFolder}
            title="Open Local Folder"
            className="p-1 rounded hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Close sidebar */}
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

      {/* ── Unified File List (scrollable) ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ─── ROOM FILES SECTION ─────────────────────────────────────────── */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800/60 border-b border-surface-700/60">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <span className="text-emerald-400">●</span> Room Files
            </span>
            <span className="text-[10px] text-slate-500">{roomFiles.length}</span>
          </div>

          {/* Room files list */}
          <div className="p-1.5 space-y-0.5">
            {roomFilesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner size="sm" />
              </div>
            ) : roomFiles.length === 0 ? (
              <div className="text-center py-6 px-3">
                <p className="text-[11px] text-slate-500">No room files yet</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Click + to create one</p>
              </div>
            ) : (
              roomFiles.map((file) => {
                const rawLang = getLanguageFromFileName(file.label || '') || file.language || 'javascript';
                const normLang = normalizeLanguage(rawLang);
                const lang = LANG_BADGES[normLang] || LANG_BADGES.javascript;
                const fileName = file.label || `file_${file._id.slice(-4)}.${lang.ext}`;
                const timeAgo = new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isActive = activeRoomFileId === file._id;

                return (
                  <div
                    key={file._id}
                    onClick={() => handleOpenRoomFile(file)}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all cursor-pointer text-xs ${
                      isActive
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 font-semibold'
                        : 'hover:bg-surface-700/80 border-transparent hover:border-surface-600'
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border flex-shrink-0 ${lang.bg}`}>
                      {lang.label}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono font-medium text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                        {fileName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {file.savedBy?.name ? file.savedBy.name.split(' ')[0] : 'User'} · {timeAgo}
                      </p>
                    </div>

                    {/* 3-dot menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenFileId((prev) => (prev === file._id ? null : file._id));
                        }}
                        title="More Options"
                        className="p-1 rounded hover:bg-surface-600 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>

                      {menuOpenFileId === file._id && (
                        <div
                          className="absolute right-0 top-7 z-50 w-36 bg-surface-800 border border-surface-600 rounded-lg shadow-xl py-1 text-xs font-mono text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => { setMenuOpenFileId(null); handleDownloadFile(e, file); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
                          >
                            <span>📥</span> Download
                          </button>
                          <button
                            onClick={(e) => { setMenuOpenFileId(null); handleDeleteRoomFile(e, file); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── LOCAL PROJECT SECTION ──────────────────────────────────────── */}
        <div className="border-t border-surface-700/60">
          {/* Section header (collapsible) */}
          <button
            onClick={() => setLocalSectionOpen((p) => !p)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-surface-800/60 hover:bg-surface-700/50 transition-colors border-b border-surface-700/60"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="text-amber-400">📂</span>
              Local Project
              {rootDirectoryHandle && (
                <span className="text-[9px] text-emerald-400 font-normal ml-1">● {rootDirectoryHandle.name}</span>
              )}
            </span>
            <svg
              className={`w-3 h-3 text-slate-500 transition-transform ${localSectionOpen ? '' : '-rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {localSectionOpen && (
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
              <div className="text-center py-5 px-4 space-y-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Open a local folder to edit files from your computer.
                </p>
                <button
                  onClick={onOpenLocalFolder}
                  className="btn-primary text-[11px] px-3 py-1.5 font-semibold w-full"
                >
                  📂 Open Folder
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-surface-600 bg-surface-800/50 text-[10px] text-slate-500 flex items-center justify-between flex-shrink-0">
        <span>{roomFiles.length} room · {rootDirectoryHandle ? rootDirectoryHandle.name : 'no local'}</span>
        <button
          onClick={onOpenSaveModal}
          className="text-brand-400 hover:text-brand-300 font-medium hover:underline"
        >
          Save As…
        </button>
      </div>

      {/* ── Create Item Modal ─────────────────────────────────────────────── */}
      <CreateItemModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal((s) => ({ ...s, isOpen: false }))}
        type={createModal.type}
        mode={createModal.mode}
        roomCode={roomCode || room?.roomCode}
        targetDirHandle={rootDirectoryHandle}
        rootHandle={rootDirectoryHandle}
        existingRoomFiles={roomFiles}
        onRefreshLocal={refreshLocalTree}
        onRefreshRoomFiles={fetchRoomFiles}
        onSelectLocalFile={handleSelectLocalFile}
      />
    </div>
  );
}
