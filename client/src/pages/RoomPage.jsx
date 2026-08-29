import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import { CollaborativeEditor } from '../components/editor/CollaborativeEditor';
import { PANEL_TABS } from '../components/editor/BottomPanel';
import { normalizeExecutionResult } from '../components/editor/OutputTab';
import { ProblemPanel } from '../components/problems/ProblemPanel';
import { TestResultPanel } from '../components/problems/TestResultPanel';
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

const TABS = { PROBLEM: 'problem', CHAT: 'chat', USERS: 'users', RESULTS: 'results' };

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, problem, setProblem, joinRoom, leaveRoom, code, setCode, language, setLanguage,
          version, setVersion, executionResult, setExecutionResult, emitCodeChange } = useRoom();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS.PROBLEM);
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
      setActiveTab(TABS.PROBLEM);
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

  const tabBtn = (tab, label) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-surface-600 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Top Bar */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-surface-600 bg-surface-800 flex-shrink-0">
        <Link to="/dashboard" className="btn-ghost p-1.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-white truncate">{room?.name}</span>
          <span className="text-xs font-mono text-slate-500 hidden sm:block">{roomCode}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={loadProblems} className="btn-secondary text-sm hidden sm:flex">
            📚 Problems
          </button>
          <button onClick={() => setShowInvite(true)} className="btn-secondary text-sm hidden sm:flex">
            🔗 Invite
          </button>
          <button
            onClick={handleRunCode}
            disabled={running}
            className="btn-primary text-sm"
            id="run-code-btn"
          >
            {running ? <Spinner size="sm" /> : '▶ Run'}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor (main) */}
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

        {/* Right Panel */}
        <div className="w-80 lg:w-96 flex flex-col border-l border-surface-600 bg-surface-800 overflow-hidden flex-shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-surface-600 bg-surface-800">
            {tabBtn(TABS.PROBLEM, '📋 Problem')}
            {tabBtn(TABS.RESULTS, '⚡ Results')}
            {tabBtn(TABS.CHAT, '💬 Chat')}
            {tabBtn(TABS.USERS, '👥 Online')}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === TABS.PROBLEM && <ProblemPanel problem={problem} />}
            {activeTab === TABS.RESULTS && <TestResultPanel result={executionResult} loading={running} />}
            {activeTab === TABS.CHAT && <ChatPanel roomCode={roomCode} />}
            {activeTab === TABS.USERS && (
              <div className="p-4">
                <OnlineUsers roomCode={roomCode} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
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
