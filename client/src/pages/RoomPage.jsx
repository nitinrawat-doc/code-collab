import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import { CollaborativeEditor } from '../components/editor/CollaborativeEditor';
import { PANEL_TABS } from '../components/editor/BottomPanel';
import { normalizeExecutionResult } from '../components/editor/OutputTab';
import { ProblemPanel } from '../components/problems/ProblemPanel';
import { ChatPanel } from '../components/chat/ChatPanel';
import { OnlineUsers } from '../components/room/OnlineUsers';
import { InviteModal } from '../components/room/InviteModal';
import { Modal } from '../components/ui/Modal';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/ui/Toast';
import { problemService } from '../services/problemService';
import { executeService } from '../services/sessionService';
import { roomService } from '../services/roomService';
import { getSocket } from '../socket/socketClient';
import { EVENTS } from '../socket/socketEvents';

const DRAWER_TABS = {
  PROBLEMS: 'problems',
  CHAT: 'chat',
  USERS: 'users',
};

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, problem, setProblem, joinRoom, leaveRoom, code, setCode, language, setLanguage,
          version, setVersion, executionResult, setExecutionResult, emitCodeChange, onlineUsers } = useRoom();

  const [loading, setLoading] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState(null); // null | 'problems' | 'chat' | 'users'
  const [showInvite, setShowInvite] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [problems, setProblems] = useState([]);
  const [running, setRunning] = useState(false);

  // Bottom Panel state
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomPanelTab, setBottomPanelTab] = useState(PANEL_TABS.TERMINAL);

  const { toasts, removeToast, success, error: showError } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        // Try joining via REST (idempotent — server returns 409 if already member)
        try {
          await roomService.join(roomCode);
        } catch (err) {
          // 409 Conflict means already a member — that's fine
          if (err.response?.status !== 409) throw err;
        }
        await joinRoom(roomCode);

        // Listen for self-removal
        const socket = getSocket();
        if (socket) {
          socket.on(EVENTS.MEMBER_REMOVED, ({ userId: removedId }) => {
            if (removedId === user?._id?.toString()) {
              leaveRoom(roomCode);
              navigate('/dashboard');
            }
          });
        }
      } catch (err) {
        showError(err.message || 'Failed to join room');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => leaveRoom(roomCode);
  }, [roomCode]);

  const toggleDrawer = (tabKey) => {
    setActiveDrawer((prev) => (prev === tabKey ? null : tabKey));
  };

  const handleRunCode = async () => {
    setRunning(true);
    setBottomPanelOpen(true);
    setBottomPanelTab(PANEL_TABS.OUTPUT);
    try {
      const { data } = await executeService.run({
        roomCode,
        code,
        language,
        problemSlug: problem?.slug || '',
      });
      setExecutionResult(data);

      const norm = normalizeExecutionResult(data);
      if (norm && (norm.stderr || norm.compileOutput)) {
        setBottomPanelTab(PANEL_TABS.PROBLEMS);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSelectProblem = async (slug) => {
    try {
      const { data } = await problemService.get(slug);
      const selectedProblem = data.problem;
      await roomService.setProblem(roomCode, selectedProblem._id);

      // Load starter code for the current language into the editor
      const starterCode = selectedProblem.starterCode?.[language] || '// Start coding here\n';
      setCode(starterCode);
      setProblem(selectedProblem);

      // Emit the code change so all collaborators get the starter code
      const newVersion = version + 1;
      setVersion(newVersion);
      emitCodeChange(roomCode, starterCode, language, newVersion);

      setShowProblems(false);
      setActiveDrawer(DRAWER_TABS.PROBLEMS);
      success(`"${selectedProblem.title}" loaded!`);
    } catch {
      showError('Failed to select problem');
    }
  };

  const loadProblems = async () => {
    try {
      const { data } = await problemService.list();
      setProblems(data.problems);
      setShowProblems(true);
    } catch { showError('Failed to load problems'); }
  };

  const isOwner = room?.owner?._id === user?._id || room?.owner === user?._id;

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden select-none">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Top Bar Navigation & Controls */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-600 bg-surface-800 flex-shrink-0 z-10">
        <Link to="/dashboard" className="btn-ghost p-1.5 text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-xs">{room?.name}</span>
          <span className="text-xs font-mono text-slate-500 hidden md:inline">{roomCode}</span>
        </div>

        <div className="flex-1" />

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2">
          {/* Problems Drawer Toggle */}
          <button
            onClick={() => toggleDrawer(DRAWER_TABS.PROBLEMS)}
            title="Toggle Problem Description"
            className={`btn text-xs px-3 py-1.5 flex items-center gap-1.5 border transition-all ${
              activeDrawer === DRAWER_TABS.PROBLEMS
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'btn-secondary'
            }`}
          >
            <span>📚</span>
            <span className="hidden sm:inline">Problems</span>
          </button>

          {/* Chat Drawer Toggle */}
          <button
            onClick={() => toggleDrawer(DRAWER_TABS.CHAT)}
            title="Toggle Live Chat"
            className={`btn text-xs px-3 py-1.5 flex items-center gap-1.5 border transition-all ${
              activeDrawer === DRAWER_TABS.CHAT
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'btn-secondary'
            }`}
          >
            <span>💬</span>
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* Online Users Drawer Toggle */}
          <button
            onClick={() => toggleDrawer(DRAWER_TABS.USERS)}
            title="Toggle Online Collaborators"
            className={`btn text-xs px-3 py-1.5 flex items-center gap-1.5 border transition-all ${
              activeDrawer === DRAWER_TABS.USERS
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'btn-secondary'
            }`}
          >
            <span>👥</span>
            <span className="hidden sm:inline">Online</span>
            {onlineUsers.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {onlineUsers.length}
              </span>
            )}
          </button>

          {/* Invite Modal Button */}
          <button
            onClick={() => setShowInvite(true)}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={running}
            className="btn-primary text-xs px-4 py-1.5 font-semibold flex items-center gap-1.5"
            id="run-code-btn"
          >
            {running ? <Spinner size="sm" /> : '▶ Run'}
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Code Editor Container (Occupies 100% available horizontal space) */}
        <div className="flex-1 overflow-hidden h-full">
          <CollaborativeEditor
            roomCode={roomCode}
            bottomPanelOpen={bottomPanelOpen}
            setBottomPanelOpen={setBottomPanelOpen}
            bottomPanelTab={bottomPanelTab}
            setBottomPanelTab={setBottomPanelTab}
            executionResult={executionResult}
            executionLoading={running}
          />
        </div>

        {/* Single Reusable Right-Side Collapsible Drawer */}
        {activeDrawer && (
          <div className="w-80 lg:w-96 flex flex-col border-l border-surface-600 bg-surface-800 overflow-hidden flex-shrink-0 transition-all duration-200 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600 bg-surface-800 flex-shrink-0">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                {activeDrawer === DRAWER_TABS.PROBLEMS && '📋 Problem Statement'}
                {activeDrawer === DRAWER_TABS.CHAT && '💬 Live Chat'}
                {activeDrawer === DRAWER_TABS.USERS && '👥 Online Collaborators'}
              </span>
              <button
                onClick={() => setActiveDrawer(null)}
                title="Close Drawer"
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-surface-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-hidden">
              {activeDrawer === DRAWER_TABS.PROBLEMS && (
                <ProblemPanel
                  problem={problem}
                  onOpenProblemPicker={loadProblems}
                />
              )}
              {activeDrawer === DRAWER_TABS.CHAT && <ChatPanel roomCode={roomCode} />}
              {activeDrawer === DRAWER_TABS.USERS && (
                <div className="p-4">
                  <OnlineUsers roomCode={roomCode} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Link Modal */}
      <InviteModal isOpen={showInvite} onClose={() => setShowInvite(false)} roomCode={roomCode} />

      {/* Problem Picker Modal */}
      <Modal isOpen={showProblems} onClose={() => setShowProblems(false)} title="Select Problem" size="lg">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {problems.map((p) => {
            const badgeClass = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }[p.difficulty];
            return (
              <button
                key={p.slug}
                onClick={() => handleSelectProblem(p.slug)}
                className="w-full text-left p-3 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 hover:border-brand-500/50 transition-all flex items-center gap-3"
              >
                <span className={badgeClass}>{p.difficulty}</span>
                <span className="text-slate-200 font-medium flex-1">{p.title}</span>
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
