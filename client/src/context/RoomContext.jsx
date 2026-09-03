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

  // ─── Mutable refs for always-current values (bypass React batching) ───
  // These are updated synchronously in every path that changes code/language,
  // so switchFile always reads the truly latest value, never a stale snapshot.
  const latestCodeRef = useRef('// Start coding here\n');
  const latestLangRef = useRef('javascript');

  // Wrapped setters that keep the refs in sync
  const setCodeSync = useCallback((val) => {
    latestCodeRef.current = val;
    setCode(val);
  }, []);

  const setLanguageSync = useCallback((val) => {
    latestLangRef.current = val;
    setLanguage(val);
  }, []);

  // In-memory cache for file contents per active file key
  const fileContentMapRef = useRef({});
  const activeFileKeyRef = useRef(null);

  // Refs to avoid stale closures in socket callbacks
  const socketRef = useRef(null);
  const currentRoomCodeRef = useRef(null);
  const versionRef = useRef(0);

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
    socket.on(EVENTS.ROOM_STATE, ({ code: c, language: l, version: v, problem: p, chatHistory }) => {
      const initCode = c ?? '// Start coding here\n';
      const initLang = l ?? 'javascript';

      latestCodeRef.current = initCode;
      latestLangRef.current = initLang;
      versionRef.current = v ?? 0;

      setCode(initCode);
      setLanguage(initLang);
      setVersion(v ?? 0);
      setProblem(p ?? null);

      if (activeFileKeyRef.current) {
        fileContentMapRef.current[activeFileKeyRef.current] = {
          code: initCode,
          language: initLang,
        };
      }

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

    // CODE_UPDATE from other clients — update code & cache without triggering emit loop
    socket.on(EVENTS.CODE_UPDATE, ({ fullCode, language: l, version: v }) => {
      latestCodeRef.current = fullCode;
      if (l) latestLangRef.current = l;
      versionRef.current = v;

      setCode(fullCode);
      if (l) setLanguage(l);
      setVersion(v);

      if (activeFileKeyRef.current) {
        fileContentMapRef.current[activeFileKeyRef.current] = {
          code: fullCode,
          language: l || latestLangRef.current,
        };
      }
    });

    socket.on(EVENTS.CODE_SYNC_RESPONSE, ({ fullCode, language: l, version: v }) => {
      latestCodeRef.current = fullCode;
      if (l) latestLangRef.current = l;
      versionRef.current = v;

      setCode(fullCode);
      if (l) setLanguage(l);
      setVersion(v);

      if (activeFileKeyRef.current) {
        fileContentMapRef.current[activeFileKeyRef.current] = {
          code: fullCode,
          language: l || latestLangRef.current,
        };
      }
    });

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
    fileContentMapRef.current = {};
    activeFileKeyRef.current = null;

    const defaultCode = '// Start coding here\n';
    latestCodeRef.current = defaultCode;
    latestLangRef.current = 'javascript';
    versionRef.current = 0;

    setRoom(null);
    setOnlineUsers([]);
    setChatMessages([]);
    setExecutionResult(null);
    setRemoteCursors({});
    setCode(defaultCode);
    setLanguage('javascript');
    setVersion(0);
    setIsConnected(false);
  }, [removeRoomListeners]);

  const emitCodeChange = useCallback((roomCode, fullCode, lang, ver) => {
    // Always keep refs in sync — this is called from handleEditorChange (user typing)
    latestCodeRef.current = fullCode;
    latestLangRef.current = lang;
    versionRef.current = ver;

    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit(EVENTS.CODE_CHANGE, { roomCode, fullCode, language: lang, version: ver });
    }

    if (activeFileKeyRef.current) {
      fileContentMapRef.current[activeFileKeyRef.current] = {
        code: fullCode,
        language: lang,
      };
    }
  }, []);

  /**
   * switchFile — switch the active editor file cleanly.
   *
   * KEY FIX: reads latestCodeRef.current (always up-to-date) instead of the
   * stale React `code` state that was captured in the closure. This ensures the
   * previous file's code is saved correctly before switching, preventing wipes.
   */
  const switchFile = useCallback((fileKey, initialCode, initialLang) => {
    // 1. Save the CURRENT file's latest code into the cache using the mutable ref
    //    (never the stale React state — that's what caused the wipe bug)
    if (activeFileKeyRef.current) {
      fileContentMapRef.current[activeFileKeyRef.current] = {
        code: latestCodeRef.current,
        language: latestLangRef.current,
      };
    }

    // 2. Set new active file key
    activeFileKeyRef.current = fileKey;

    // 3. Resolve target code & language from in-memory cache or provided initial values
    const cached = fileContentMapRef.current[fileKey];
    const targetCode = cached?.code !== undefined ? cached.code : (initialCode ?? '');
    const targetLang = cached?.language || initialLang || 'javascript';

    // 4. Store into cache
    fileContentMapRef.current[fileKey] = { code: targetCode, language: targetLang };

    // 5. Update refs first (before React state) so any immediate reads are correct
    latestCodeRef.current = targetCode;
    latestLangRef.current = targetLang;

    // 6. Update React state (triggers re-render + Monaco update)
    setCode(targetCode);
    setLanguage(targetLang);

    // 7. Broadcast to room collaborators if connected
    const roomCode = currentRoomCodeRef.current || null;
    if (roomCode) {
      const socket = socketRef.current || getSocket();
      if (socket?.connected) {
        const newVer = versionRef.current + 1;
        versionRef.current = newVer;
        setVersion(newVer);
        socket.emit(EVENTS.CODE_CHANGE, { roomCode, fullCode: targetCode, language: targetLang, version: newVer });
      }
    }
  }, []); // No dependencies on stale React state — uses only mutable refs

  const sendChat = useCallback((roomCode, content) => {
    const socket = socketRef.current || getSocket();
    const targetCode = roomCode || currentRoomCodeRef.current;
    if (socket && targetCode && content && content.trim()) {
      socket.emit(EVENTS.CHAT_SEND, { roomCode: targetCode, content: content.trim() });
    }
  }, []);

  const emitCursor = useCallback((roomCode, position) => {
    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit(EVENTS.CURSOR_MOVE, { roomCode, position });
    }
  }, []);

  return (
    <RoomContext.Provider value={{
      room, setRoom, onlineUsers, code, setCode: setCodeSync, language, setLanguage: setLanguageSync,
      version, setVersion, problem, setProblem, chatMessages, executionResult,
      setExecutionResult, remoteCursors, isConnected, activeFileKey: activeFileKeyRef.current,
      joinRoom, leaveRoom, emitCodeChange, switchFile, sendChat, emitCursor,
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
