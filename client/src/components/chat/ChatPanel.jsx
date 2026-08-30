import { useState, useRef, useEffect } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';

export function ChatPanel({ roomCode: roomCodeProp }) {
  const { room, chatMessages, sendChat } = useRoom();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  const activeRoomCode = roomCodeProp || room?.roomCode || '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    sendChat(activeRoomCode, content);
    setInput('');
  };

  const formatTime = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  const currentUserId = (user?._id || user?.id || '').toString();

  return (
    <div className="flex flex-col h-full bg-surface-850 text-xs">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span>💬</span> Room Chat
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">
          {chatMessages.length} msg{chatMessages.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-xs font-semibold">No messages yet</p>
            <p className="text-[11px] mt-1 text-slate-600">Start the conversation with your team!</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const senderObj = msg.sender || {};
            const senderId = (senderObj.id || senderObj._id || senderObj || '').toString();
            const senderName = senderObj.name || msg.senderName || 'User';
            const isMe = Boolean(currentUserId && senderId && currentUserId === senderId);

            return (
              <div key={msg.id || msg._id || idx} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  title={senderName}
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-brand-500 to-cyan-500 select-none shadow-sm"
                >
                  {senderName.charAt(0).toUpperCase()}
                </div>

                <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] text-slate-400 font-semibold px-1 truncate max-w-[120px]">
                      {senderName}
                    </span>
                  )}
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs leading-relaxed break-words font-sans ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-surface-700 text-slate-200 rounded-tl-none border border-surface-600'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-500 px-1 font-mono">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-surface-600 bg-surface-800">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="input flex-1 text-xs py-1.5 font-sans text-white bg-surface-900 border-surface-600 focus:border-brand-400"
            placeholder="Type a message and press Enter..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            id="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn-primary text-xs px-3 py-1.5 font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <span>Send</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
