import { useState, useRef, useEffect } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';

export function ChatPanel({ roomCode }) {
  const { chatMessages, sendChat } = useRoom();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    sendChat(roomCode, content);
    setInput('');
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-surface-600">
        <h3 className="text-sm font-semibold text-slate-200">Room Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {chatMessages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No messages yet.</p>
            <p className="text-slate-600 text-xs mt-1">Start the conversation!</p>
          </div>
        )}
        {chatMessages.map((msg, idx) => {
          const isMe = msg.sender?.id === user?._id || msg.sender === user?._id;
          return (
            <div key={msg.id || idx} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-cyan-500"
              >
                {(msg.sender?.name || msg.senderName || '?').charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className="text-xs text-slate-500 px-1">{msg.sender?.name || msg.senderName}</span>
                )}
                <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-surface-700 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-600 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-surface-600">
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm py-2"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            id="chat-input"
          />
          <button type="submit" className="btn-primary px-3 py-2" disabled={!input.trim()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
