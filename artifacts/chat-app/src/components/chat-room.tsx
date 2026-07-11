import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Activity, Users, Circle, Loader2 } from 'lucide-react';
import { useListMessages, useSendMessage, Message } from '@workspace/api-client-react';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function ChatRoom({ username }: { username: string }) {
  const { data: historyMessages, isLoading: isHistoryLoading } = useListMessages({ limit: 100 });
  const { 
    onlineUsers, 
    typingUsers, 
    liveMessages, 
    isConnected, 
    startTyping, 
    stopTyping 
  } = useChatSocket(username);

  const sendMessageMutation = useSendMessage();

  const allMessages = useMemo(() => {
    const map = new Map<number, Message>();
    historyMessages?.forEach(m => map.set(m.id, m));
    liveMessages.forEach(m => map.set(m.id, m));
    return Array.from(map.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [historyMessages, liveMessages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, typingUsers]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setContent('');
    stopTyping();
    
    sendMessageMutation.mutate({ data: { username, content: trimmed } }, {
      // No need to manually append, socket will broadcast "message:new"
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    startTyping();
  };

  // Deduplicate typing users to avoid showing our own name
  const otherTypingUsers = Array.from(new Set(typingUsers)).filter(u => u !== username);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/20 hidden md:flex flex-col z-20 shadow-sm">
        <div className="h-16 border-b flex items-center px-6 gap-3 bg-background">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Pulse</span>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            In the Room ({onlineUsers.length})
          </h2>
          <ul className="space-y-3">
            {onlineUsers.map(u => (
              <li key={u} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-8 h-8 border border-border bg-background">
                    <AvatarFallback className="text-xs font-semibold">{u.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
                </div>
                <span className="text-sm font-medium text-foreground truncate">{u} {u === username && <span className="text-muted-foreground font-normal">(You)</span>}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t bg-background">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Circle className={cn("w-2.5 h-2.5 fill-current", isConnected ? "text-green-500" : "text-destructive")} />
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
        {/* Mobile Header */}
        <div className="h-16 border-b flex md:hidden items-center justify-between px-4 bg-background z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight">Pulse</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Circle className={cn("w-2 h-2 fill-current", isConnected ? "text-green-500" : "text-destructive")} />
            {onlineUsers.length} online
          </div>
        </div>

        {/* Messages list */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 scroll-smooth bg-zinc-50/50"
        >
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : allMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <div className="w-16 h-16 bg-white shadow-sm border rounded-full flex items-center justify-center mb-2">
                <Activity className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">The room is empty. Start the conversation!</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              <AnimatePresence initial={false}>
                {allMessages.map((msg, index) => {
                  const isSelf = msg.username === username;
                  const prevMsg = allMessages[index - 1];
                  const showHeader = !prevMsg || prevMsg.username !== msg.username || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60000);
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 group",
                        !showHeader && "mt-1",
                        showHeader && index !== 0 && "mt-6"
                      )}
                    >
                      <div className="w-10 flex-shrink-0 flex justify-center">
                        {showHeader ? (
                          <Avatar className="w-10 h-10 shadow-sm border-zinc-200">
                            <AvatarFallback className={cn("text-sm font-semibold", isSelf ? "bg-primary/10 text-primary" : "bg-white text-zinc-600 border")}>
                              {msg.username.substring(0,2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 text-[10px] font-medium text-muted-foreground/0 group-hover:text-muted-foreground/50 text-center leading-6 select-none flex items-center justify-center transition-colors">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {showHeader && (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-[15px] leading-none text-foreground">{msg.username}</span>
                            <span className="text-xs font-medium text-muted-foreground">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                          </div>
                        )}
                        <div className="text-[15px] text-zinc-800 leading-relaxed break-words whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          
          {/* Typing indicator */}
          <div className="h-6 max-w-4xl mx-auto w-full">
            <AnimatePresence>
              {otherTypingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground ml-14"
                >
                  <div className="flex gap-1 items-center bg-white border px-2 py-1.5 rounded-full shadow-sm">
                    <motion.span className="w-1.5 h-1.5 bg-zinc-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                    <motion.span className="w-1.5 h-1.5 bg-zinc-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                    <motion.span className="w-1.5 h-1.5 bg-zinc-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
                  </div>
                  <span>
                    {otherTypingUsers.length === 1 
                      ? `${otherTypingUsers[0]} is typing...` 
                      : `${otherTypingUsers.length} people are typing...`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t sticky bottom-0 z-20 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.02)]">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center shadow-sm rounded-xl bg-zinc-50 border border-zinc-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <Input
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Message the room..."
              className="h-14 w-full border-0 bg-transparent px-4 pr-16 text-[15px] font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-400"
              autoComplete="off"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!content.trim() || sendMessageMutation.isPending}
              className={cn(
                "absolute right-2 h-10 w-10 rounded-lg transition-all shadow-none",
                content.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-sm" : "bg-transparent text-zinc-300 hover:bg-transparent"
              )}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
          <div className="max-w-4xl mx-auto mt-2 text-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pulse Studio Chat</span>
          </div>
        </div>
      </div>
    </div>
  );
}