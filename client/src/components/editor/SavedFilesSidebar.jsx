import { useState, useEffect, useCallback, useRef } from 'react';
import { historyService } from '../../services/sessionService';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../../hooks/useToast';
import { Spinner } from '../ui/Spinner';
import { LocalFolderTree } from './LocalFolderTree';
import {
  readLocalFile,
} from '../../services/fileSystem.service';

const LANG_BADGES = {
  javascript: { label: 'JS', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', ext: 'js' },
  python: { label: 'PY', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', ext: 'py' },
  cpp: { label: 'C++', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', ext: 'cpp' },
  java: { label: 'Java', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', ext: 'java' },
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
  const { setCode, setLanguage, setVersion, emitCodeChange, version, code } = useRoom();
  const { success, error: showError } = useToast();

  const [explorerTab, setExplorerTab] = useState('local'); // 'local' | 'room'
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Trigger state for LocalFolderTree inline creation
  const [creationTrigger, setCreationTrigger] = useState(null); // { type: 'file' | 'folder' }

  // Inline creation state for Room Files mode
  const [creatingRoomFile, setCreatingRoomFile] = useState(false);
  const [roomFileName, setRoomFileName] = useState('');
  const roomInputRef = useRef(null);

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

  // Focus input when inline room file creation activates
  useEffect(() => {
    if (creatingRoomFile && roomInputRef.current) {
      roomInputRef.current.focus();
    }
  }, [creatingRoomFile]);

  // Handle New File Creation Trigger
  const handleHeaderCreateFile = () => {
    setShowAddMenu(false);
    if (explorerTab === 'local') {
      if (!rootDirectoryHandle) {
        showError('Open a local project folder first to create files.');
        return;
      }
      setCreationTrigger({ type: 'file' });
    } else {
      setCreatingRoomFile(true);
    }
  };

  // Handle New Directory Creation Trigger
  const handleHeaderCreateDirectory = () => {
    setShowAddMenu(false);
    if (explorerTab === 'local') {
      if (!rootDirectoryHandle) {
        showError('Open a local project folder first to create folders.');
        return;
      }
      setCreationTrigger({ type: 'folder' });
    } else {
      showError('Folder hierarchies in Room mode are managed through local project import.');
    }
  };

  // Submit new Room file
  const handleSubmitRoomFile = async () => {
    if (!roomFileName.trim()) {
      setCreatingRoomFile(false);
      return;
    }
    const cleanName = roomFileName.trim();
    setCreatingRoomFile(false);
    setRoomFileName('');

    try {
      const ext = cleanName.split('.').pop()?.toLowerCase();
      const lang = ext === 'cpp' || ext === 'h' ? 'cpp' : ext === 'py' ? 'python' : ext === 'java' ? 'java' : 'javascript';
      await historyService.save(roomCode, {
        code: '// New file created in room\n',
        language: lang,
        label: cleanName,
      });

      const newVer = version + 1;
      setCode('// New file created in room\n');
      setLanguage(lang);
      setVersion(newVer);
      emitCodeChange(roomCode, '// New file created in room\n', lang, newVer);

      await fetchSavedFiles();
      success(`Created room file: ${cleanName}`);
    } catch (err) {
      showError('Failed to create file in room');
    }
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
      const newVer = version + 1;
      setCode(text);
      setLanguage(node.language);
      setVersion(newVer);
      emitCodeChange(roomCode, text, node.language, newVer);
      setActiveLocalFile(node);
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
      await historyService.save(roomCode, {
        code,
        language: activeLocalFile.language || 'javascript',
        label: activeLocalFile.name || 'Imported File',
      });
      fetchSavedFiles();
      success(`Imported '${activeLocalFile.name}' to Room Files! Collaborators can now access it.`);
    } catch (err) {
      showError('Failed to import file to room');
    }
  };

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

      success(`Opened room file: ${v.label || 'Saved File'}`);
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
              creationTrigger={creationTrigger}
              onClearCreationTrigger={() => setCreationTrigger(null)}
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
            {/* Inline Creation Input for Room Files Mode */}
            {creatingRoomFile && (
              <div className="flex items-center gap-1.5 py-1 px-2 bg-surface-800 border border-brand-500/60 rounded mb-2">
                <span className="text-xs">📄</span>
                <input
                  ref={roomInputRef}
                  type="text"
                  value={roomFileName}
                  onChange={(e) => setRoomFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitRoomFile();
                    if (e.key === 'Escape') setCreatingRoomFile(false);
                  }}
                  onBlur={handleSubmitRoomFile}
                  placeholder="filename.cpp"
                  className="bg-surface-900 text-xs font-mono text-white px-1.5 py-0.5 rounded border border-surface-600 outline-none w-full focus:border-brand-400"
                />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : files.length === 0 && !creatingRoomFile ? (
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
                const lang = LANG_BADGES[file.language] || LANG_BADGES.javascript;
                const fileName = file.label || `file_${file._id.slice(-4)}.${lang.ext}`;
                const timeAgo = new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={file._id}
                    onClick={() => handleOpenFile(file)}
                    className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-surface-700/80 border border-transparent hover:border-surface-600 transition-all cursor-pointer text-xs"
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
    </div>
  );
}
