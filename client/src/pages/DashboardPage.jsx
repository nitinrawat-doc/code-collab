import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomService } from '../services/roomService';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/ui/Toast';

function RoomCard({ room, onClick }) {
  const statusColor = room.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600';
  return (
    <button
      onClick={onClick}
      className="card hover:border-brand-500/50 hover:bg-surface-700 transition-all duration-200 text-left group w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-brand-400 transition-colors">{room.name}</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{room.roomCode}</p>
        </div>
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor}`} />
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{room.members?.length || 0} / {room.maxMembers} members</span>
        <span>•</span>
        <span>{new Date(room.createdAt).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toasts, removeToast, success, error: showError } = useToast();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data } = await roomService.list();
      setRooms(data.rooms);
    } catch (err) {
      showError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await roomService.create({ name: roomName });
      success('Room created!');
      setShowCreateModal(false);
      setRoomName('');
      navigate(`/room/${data.room.roomCode}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const code = joinCode.trim().toUpperCase();
      await roomService.join(code);
      navigate(`/room/${code}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to join room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-900">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <header className="border-b border-surface-600 bg-surface-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">CodeCollab</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/problems" className="btn-ghost text-sm">Problems</Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-300 hidden sm:block">{user?.name}</span>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-sm text-red-400 hover:text-red-300">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400">Ready to solve some problems together?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setShowCreateModal(true)}
            className="card hover:border-brand-500/50 hover:bg-surface-700 transition-all duration-200 text-left group"
            id="create-room-btn"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center group-hover:bg-brand-500/30 transition-colors">
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Create Room</h3>
                <p className="text-sm text-slate-400">Start a new coding session</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className="card hover:border-cyan-500/50 hover:bg-surface-700 transition-all duration-200 text-left group"
            id="join-room-btn"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Join Room</h3>
                <p className="text-sm text-slate-400">Enter a room code to join</p>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Rooms */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Rooms</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">No rooms yet</p>
              <p className="text-slate-600 text-sm mt-1">Create or join a room to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onClick={() => navigate(`/room/${room.roomCode}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Room Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Room">
        <form onSubmit={handleCreateRoom} className="space-y-5">
          <div>
            <label className="label" htmlFor="room-name">Room Name</label>
            <input
              id="room-name"
              className="input"
              placeholder="e.g. Graph Problems Session"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Room">
        <form onSubmit={handleJoinRoom} className="space-y-5">
          <div>
            <label className="label" htmlFor="join-code">Room Code</label>
            <input
              id="join-code"
              className="input font-mono text-xl tracking-[0.3em] text-center uppercase"
              placeholder="XXXXXXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              maxLength={8}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Join Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
