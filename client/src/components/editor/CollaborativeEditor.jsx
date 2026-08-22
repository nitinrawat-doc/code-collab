import Editor from '@monaco-editor/react';
import { useRoom } from '../../context/RoomContext';
import { useRef, useCallback, useEffect, useState } from 'react';
import { EVENTS } from '../../socket/socketEvents';
import { getSocket } from '../../socket/socketClient';
import { useToast } from '../../hooks/useToast';
import { SavedFilesSidebar } from './SavedFilesSidebar';
import { SaveFileModal } from './SaveFileModal';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', ext: 'js' },
  { value: 'python', label: 'Python', ext: 'py' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
  { value: 'java', label: 'Java', ext: 'java' },
];

const MONACO_LANG = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
};

export function CollaborativeEditor({ roomCode }) {
  const { code, setCode, language, setLanguage, version, setVersion, emitCodeChange, problem } = useRoom();
  const { success } = useToast();

  const [showSidebar, setShowSidebar] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [refreshSidebarKey, setRefreshSidebarKey] = useState(0);

  const suppressRef = useRef(false);
  const versionRef = useRef(version);
  const editorRef = useRef(null);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const handleOpenSaveModal = useCallback(() => {
    setShowSaveModal(true);
  }, []);

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

  // Global Keyboard Shortcuts (Ctrl+S for Save Modal, Ctrl+B for Sidebar Toggle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleOpenSaveModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenSaveModal]);

  const handleEditorChange = useCallback(
    (value) => {
      if (suppressRef.current) return;
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

    // Bind Ctrl+S inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleOpenSaveModal();
    });

    // Bind Ctrl+B inside Monaco (Toggle Sidebar)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      setShowSidebar((prev) => !prev);
    });
  };

  const prevCodeRef = useRef(code);
  useEffect(() => {
    if (prevCodeRef.current !== code) {
      suppressRef.current = true;
      prevCodeRef.current = code;
      Promise.resolve().then(() => {
        suppressRef.current = false;
      });
    }
  });

  return (
    <div className="flex flex-col h-full bg-surface-900 overflow-hidden">
      {/* Top Toolbar Header */}
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-surface-600 bg-surface-800 flex-shrink-0">
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

        {/* Language Selector */}
        <select
          id="language-selector"
          value={language}
          onChange={handleLanguageChange}
          className="input w-36 py-1 text-xs font-mono"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Save Code / Save As Button */}
        <button
          onClick={handleOpenSaveModal}
          title="Save File with custom name (Ctrl+S)"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Save File</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-brand-200 bg-brand-700/50 rounded">
            Ctrl+S
          </kbd>
        </button>

        {/* Export / Download File Button */}
        <button
          onClick={handleDownloadCode}
          title="Download file to computer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-300 hover:text-white border border-surface-600 transition-all"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden md:inline">Export</span>
        </button>

        <div className="flex-1" />

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
          <span className="hidden sm:inline">Live Sync</span>
        </div>
      </div>

      {/* Editor & Explorer Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* VS Code Style Saved Files Sidebar */}
        <SavedFilesSidebar
          roomCode={roomCode}
          isOpen={showSidebar}
          onToggle={() => setShowSidebar(false)}
          onOpenSaveModal={handleOpenSaveModal}
          refreshKey={refreshSidebarKey}
        />

        {/* Monaco Editor Component */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={MONACO_LANG[language]}
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

      {/* Custom File Name Save Modal */}
      <SaveFileModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        roomCode={roomCode}
        currentLanguage={language}
        problemTitle={problem?.title || ''}
        onSaveSuccess={() => setRefreshSidebarKey((prev) => prev + 1)}
      />
    </div>
  );
}
