import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '@workspace/api-client-react';

export function useChatSocket(username: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!username) return;

    const s = io({ path: "/api/socket.io/" });
    setSocket(s);

    function onConnect() {
      setIsConnected(true);
      s.emit("identify", { username });
    }

    function onDisconnect() {
      setIsConnected(false);
      setOnlineUsers([]);
      setTypingUsers([]);
    }
    
    function onConnectError() {
      setIsConnected(false);
    }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    s.on("message:new", (msg: Message) => {
      setLiveMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    s.on("presence:update", (payload: { online: string[] }) => {
      setOnlineUsers(payload.online);
    });

    s.on("typing:update", (payload: { usernames: string[] }) => {
      setTypingUsers(payload.usernames);
    });

    return () => {
      s.disconnect();
    };
  }, [username]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start");
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop");
    }, 2000);
  }, [socket, isConnected]);

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("typing:stop");
    }
  }, [socket, isConnected]);

  return {
    onlineUsers,
    typingUsers,
    liveMessages,
    isConnected,
    startTyping,
    stopTyping
  };
}