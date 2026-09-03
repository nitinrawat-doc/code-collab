import Editor from '@monaco-editor/react';
import { useRoom } from '../../context/RoomContext';
import { useRef, useCallback, useEffect, useState } from 'react';
import { EVENTS } from '../../socket/socketEvents';
import { getSocket } from '../../socket/socketClient';
import { useToast } from '../../hooks/useToast';
import { SavedFilesSidebar } from './SavedFilesSidebar';
import { SaveFileModal } from './SaveFileModal';
import { GitHubModal } from './GitHubModal';
import { BottomPanel, PANEL_TABS } from './BottomPanel';
import {
  isFileSystemAccessSupported,
  buildDirectoryTree,
  writeLocalFile,
  normalizeLanguage,
} from '../../services/fileSystem.service';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', ext: 'js' },
  { value: 'python', label: 'Python', ext: 'py' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
  { value: 'java', label: 'Java', ext: 'java' },
  { value: 'typescript', label: 'TypeScript', ext: 'ts' },
  { value: 'html', label: 'HTML', ext: 'html' },
  { value: 'css', label: 'CSS', ext: 'css' },
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'markdown', label: 'Markdown', ext: 'md' },
];

const MONACO_LANG = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  typescript: 'typescript',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'markdown',
};

export function CollaborativeEditor({
  roomCode,
  bottomPanelOpen = false,
  setBottomPanelOpen,
  bottomPanelTab = PANEL_TABS.TERMINAL,
  setBottomPanelTab,
  executionResult = null,
  executionLoading = false,
}) {
  const { code, setCode, language, setLanguage, version, setVersion, emitCodeChange, problem } = useRoom();
  const { success, error: showError } = useToast();

  const [showSidebar, setShowSidebar] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [refreshSidebarKey, setRefreshSidebarKey] = useState(0);

  // Local Project Directory Handle & Tree state
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState(null);
  const [localTreeNodes, setLocalTreeNodes] = useState([]);
  const [activeLocalFile, setActiveLocalFile] = useState(null);

  const suppressRef = useRef(false);
  const versionRef = useRef(version);
  const editorRef = useRef(null);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const handleOpenSaveModal = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  // Open Local Folder using Native Directory Picker
  const handleOpenLocalFolder = async () => {
    if (!isFileSystemAccessSupported()) {
      showError('Direct Local Folder Access requires a modern browser supporting the File System Access API.');
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();
      setRootDirectoryHandle(handle);
      const nodes = await buildDirectoryTree(handle);
      setLocalTreeNodes(nodes);
      setShowSidebar(true);
      success(`Opened local project: ${handle.name}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showError(`Failed to open folder: ${err.message}`);
      }
    }
  };

  const refreshLocalTree = async () => {
    if (!rootDirectoryHandle) return;
    try {
      const nodes = await buildDirectoryTree(rootDirectoryHandle);
      setLocalTreeNodes(nodes);
    } catch {
      // ignore
    }
  };

  // Direct Save to Local File (if active) or Open Save Modal
  const handleSaveCode = async () => {
    if (activeLocalFile?.handle) {
      try {
        await writeLocalFile(activeLocalFile.handle, code);
        success(`Saved changes to local disk: ${activeLocalFile.name}`);
      } catch (err) {
        showError(`Failed to write to local disk: ${err.message}`);
      }
    } else {
      handleOpenSaveModal();
    }
  };

  const handleDownloadCode = useCallback(() => {
    const langObj = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0];
    const fileName = language === 'java' ? 'Solution.java' : `main.${langObj.ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Exported ${fileName}`);
  }, [code, language, success]);

  // Jump to specific line and column in Monaco Editor
  const handleJumpToLine = useCallback(({ line, column }) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: column || 1 });
      editorRef.current.focus();
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        if (setBottomPanelOpen) setBottomPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveCode, setBottomPanelOpen]);

  const isProgrammaticRef = useRef(false);

  useEffect(() => {
    isProgrammaticRef.current = true;
  }, [code]);

  const handleEditorChange = useCallback(
    (value) => {
      if (isProgrammaticRef.current) {
        isProgrammaticRef.current = false;
        return;
      }
      if (value === undefined) return;

      const newVersion = versionRef.current + 1;
      versionRef.current = newVersion;
      setVersion(newVersion);
      setCode(value);
      emitCodeChange(roomCode, value, language, newVersion);
    },
    [language, roomCode, emitCodeChange, setCode, setVersion]
  );

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const newVersion = versionRef.current + 1;
    versionRef.current = newVersion;
    setVersion(newVersion);
    emitCodeChange(roomCode, code, newLang, newVersion);
  };

  const handleCursorChange = useCallback(
    (editor) => {
      const pos = editor.getPosition();
      if (pos) {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit(EVENTS.CURSOR_MOVE, { roomCode, position: pos });
        }
      }
    },
    [roomCode]
  );

  const handleEditorMountFull = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition(() => handleCursorChange(editor));

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      setShowSidebar((prev) => !prev);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_BACKTICK, () => {
      if (setBottomPanelOpen) setBottomPanelOpen((prev) => !prev);
    });
  };

  return (
    <div className="flex flex-col h-full bg-surface-900 overflow-hidden">
      {/* Top Toolbar Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-600 bg-surface-800 flex-shrink-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          title="Toggle Files Sidebar (Ctrl+B)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            showSidebar
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
              : 'bg-surface-700 hover:bg-surface-600 text-slate-300 border-surface-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="hidden sm:inline">Files</span>
        </button>

        {/* Toggle Terminal Panel Button */}
        <button
          onClick={() => setBottomPanelOpen && setBottomPanelOpen((prev) => !prev)}
          title="Toggle Bottom Terminal Panel (Ctrl+`)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            bottomPanelOpen
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
              : 'bg-surface-700 hover:bg-surface-600 text-slate-300 border-surface-600'
          }`}
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Terminal</span>
        </button>

        {/* Language Selector */}
        <select
          id="language-selector"
          value={normalizeLanguage(language)}
          onChange={handleLanguageChange}
          className="input w-32 py-1 text-xs font-mono"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Save File Button */}
        <button
          onClick={handleSaveCode}
          title="Save File to Disk or Room (Ctrl+S)"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Save</span>
        </button>

        {/* Export / Download File Button */}
        <button
          onClick={handleDownloadCode}
          title="Export file to computer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-300 border border-surface-600 transition-all"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* GitHub Integration Modal Trigger */}
        <button
          onClick={() => setShowGitHubModal(true)}
          title="Connect GitHub & Push Commits"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-600 transition-all"
        >
          <span>🐙</span>
          <span className="hidden lg:inline">GitHub</span>
        </button>

        <div className="flex-1" />

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
          <span className="hidden sm:inline">Live Sync</span>
        </div>
      </div>

      {/* Editor & Explorer Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Saved Files & Local Directory Tree Explorer */}
        <SavedFilesSidebar
          roomCode={roomCode}
          isOpen={showSidebar}
          onToggle={() => setShowSidebar(false)}
          onOpenSaveModal={handleOpenSaveModal}
          refreshKey={refreshSidebarKey}
          onOpenLocalFolder={handleOpenLocalFolder}
          rootDirectoryHandle={rootDirectoryHandle}
          localTreeNodes={localTreeNodes}
          activeLocalFile={activeLocalFile}
          setActiveLocalFile={setActiveLocalFile}
          refreshLocalTree={refreshLocalTree}
        />

        {/* Monaco Editor Component */}
        <div className="flex-1 overflow-hidden h-full">
          <Editor
            height="100%"
            language={MONACO_LANG[normalizeLanguage(language)] || 'javascript'}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorMountFull}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 16, bottom: 16 },
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
            }}
          />
        </div>
      </div>

      {/* Bottom Panel Component */}
      <BottomPanel
        roomCode={roomCode}
        executionResult={executionResult}
        executionLoading={executionLoading}
        language={language}
        onSelectError={handleJumpToLine}
        isOpen={bottomPanelOpen}
        onClose={() => setBottomPanelOpen && setBottomPanelOpen(false)}
        activeTab={bottomPanelTab}
        onTabChange={(tab) => setBottomPanelTab && setBottomPanelTab(tab)}
      />

      {/* Custom File Name Save Modal */}
      <SaveFileModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        roomCode={roomCode}
        currentLanguage={language}
        problemTitle={problem?.title || ''}
        onSaveSuccess={() => setRefreshSidebarKey((prev) => prev + 1)}
      />

      {/* GitHub Commit & Push Modal */}
      <GitHubModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        currentCode={code}
        currentLanguage={language}
        roomCode={roomCode}
      />
    </div>
  );
}
