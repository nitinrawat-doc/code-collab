import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/roomService';

export function OnlineUsers({ roomCode }) {
  const { onlineUsers } = useRoom();
  const { user } = useAuth();

  if (!onlineUsers.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
        Online ({onlineUsers.length})
      </p>
      <div className="space-y-1">
        {onlineUsers.map((u) => (
          <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-700 transition-colors">
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: u.color || '#4ade80' }}
              >
                {u.name?.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {u.name}
                {u.id === user?._id && (
                  <span className="text-xs text-slate-500 ml-1">(you)</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
