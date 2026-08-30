import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { getSocket } from '../socket/socketClient';
import { EVENTS } from '../socket/socketEvents';
import { roomService } from '../services/roomService';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [code, setCode] = useState('// Start coding here\n');
  const [language, setLanguage] = useState('javascript');
  const [version, setVersion] = useState(0);
  const [problem, setProblem] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [executionResult, setExecutionResult] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  // Refs to avoid stale closures in socket callbacks
  const socketRef = useRef(null);
  const currentRoomCodeRef = useRef(null);

  /**
   * Remove all socket listeners we registered for a room session.
   * Called on leave / cleanup to prevent accumulation.
   */
  const removeRoomListeners = useCallback((socket) => {
    socket.off(EVENTS.ROOM_STATE);
    socket.off(EVENTS.PRESENCE_UPDATE);
    socket.off(EVENTS.CODE_UPDATE);
    socket.off(EVENTS.CODE_SYNC_RESPONSE);
    socket.off(EVENTS.CHAT_MESSAGE);
    socket.off(EVENTS.PROBLEM_UPDATE);
    socket.off(EVENTS.EXECUTION_RESULT);
    socket.off(EVENTS.CURSOR_UPDATE);
    socket.off(EVENTS.ROOM_CLOSED);
    socket.off(EVENTS.MEMBER_REMOVED);
    socket.off(EVENTS.ERROR);
  }, []);

  const joinRoom = useCallback(async (roomCode) => {
    const socket = getSocket();
    if (!socket) {
      throw new Error('Socket not connected. Please log out and log in again.');
    }

    // Remove any stale listeners from a previous room session
    removeRoomListeners(socket);

    socketRef.current = socket;
    currentRoomCodeRef.current = roomCode;

    // Fetch room data via REST to confirm membership / room exists
    const { data } = await roomService.get(roomCode);
    setRoom(data.room);

    // Register listeners BEFORE emitting room:join
    // so we don't miss the room:state event

    socket.on(EVENTS.ROOM_STATE, ({ code: c, language: l, version: v, problem: p, chatHistory }) => {
      setCode(c ?? '// Start coding here\n');
      setLanguage(l ?? 'javascript');
      setVersion(v ?? 0);
      setProblem(p ?? null);
      if (chatHistory && Array.isArray(chatHistory)) {
        const formatted = chatHistory.map((m) => ({
          id: (m._id || m.id || '').toString(),
          sender: m.sender ? {
            id: (m.sender._id || m.sender.id || m.sender).toString(),
            name: m.sender.name || m.senderName || 'User',
            avatar: m.sender.avatar,
          } : { id: (m.senderName || '').toString(), name: m.senderName || 'User' },
          content: m.content,
          createdAt: m.createdAt,
        }));
        setChatMessages(formatted);
      } else {
        setChatMessages([]);
      }
    });

    socket.on(EVENTS.PRESENCE_UPDATE, ({ onlineUsers: users }) => {
      setOnlineUsers(users ?? []);
    });

    // CODE_UPDATE from other clients — update code without triggering emit
    socket.on(EVENTS.CODE_UPDATE, ({ fullCode, language: l, version: v }) => {
      setCode(fullCode);
      setLanguage(l);
      setVersion(v);
    });

    socket.on(EVENTS.CODE_SYNC_RESPONSE, ({ fullCode, language: l, version: v }) => {
      setCode(fullCode);
      setLanguage(l);
      setVersion(v);
    });

    socket.off(EVENTS.CHAT_MESSAGE);
    socket.on(EVENTS.CHAT_MESSAGE, (msg) => {
      if (!msg) return;
      const targetId = (msg.id || msg._id || '').toString();
      setChatMessages((prev) => {
        if (targetId && prev.some((m) => ((m.id || m._id || '').toString() === targetId))) {
          return prev; // Ignore duplicate message
        }
        return [...prev, msg];
      });
    });

    socket.on(EVENTS.PROBLEM_UPDATE, ({ problem: p }) => setProblem(p));

    socket.on(EVENTS.EXECUTION_RESULT, (result) => setExecutionResult(result));

    socket.on(EVENTS.CURSOR_UPDATE, ({ userId, name, position }) => {
      setRemoteCursors((prev) => ({ ...prev, [userId]: { name, position } }));
    });

    socket.on(EVENTS.ROOM_CLOSED, () => {
      leaveRoom(roomCode);
      window.location.href = '/dashboard';
    });

    socket.on(EVENTS.MEMBER_REMOVED, ({ userId: removedId }) => {
      // The RoomPage will handle redirect for the affected user
    });

    socket.on(EVENTS.ERROR, ({ message }) => {
      console.error('[socket] Room error:', message);
    });

    // Now join the socket room
    socket.emit(EVENTS.ROOM_JOIN, { roomCode });
    setIsConnected(true);
  }, [removeRoomListeners]);

  const leaveRoom = useCallback((roomCode) => {
    const socket = socketRef.current || getSocket();
    if (socket) {
      if (roomCode) socket.emit(EVENTS.ROOM_LEAVE, { roomCode });
      removeRoomListeners(socket);
    }
    socketRef.current = null;
    currentRoomCodeRef.current = null;
    setRoom(null);
    setOnlineUsers([]);
    setChatMessages([]);
    setExecutionResult(null);
    setRemoteCursors({});
    setCode('// Start coding here\n');
    setIsConnected(false);
  }, [removeRoomListeners]);

  const emitCodeChange = useCallback((roomCode, fullCode, lang, ver) => {
    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit(EVENTS.CODE_CHANGE, { roomCode, fullCode, language: lang, version: ver });
    }
  }, []);

  const sendChat = useCallback((roomCode, content) => {
    const socket = socketRef.current || getSocket();
    const targetCode = roomCode || currentRoomCodeRef.current || room?.roomCode;
    if (socket && targetCode && content && content.trim()) {
      socket.emit(EVENTS.CHAT_SEND, { roomCode: targetCode, content: content.trim() });
    }
  }, [room]);

  const emitCursor = useCallback((roomCode, position) => {
    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit(EVENTS.CURSOR_MOVE, { roomCode, position });
    }
  }, []);

  return (
    <RoomContext.Provider value={{
      room, setRoom, onlineUsers, code, setCode, language, setLanguage,
      version, setVersion, problem, setProblem, chatMessages, executionResult,
      setExecutionResult, remoteCursors, isConnected,
      joinRoom, leaveRoom, emitCodeChange, sendChat, emitCursor,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export const useRoom = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be inside RoomProvider');
  return ctx;
};
