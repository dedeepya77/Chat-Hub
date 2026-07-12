import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Hash, Loader2, Send } from 'lucide-react';
import {
  useListMessages,
  useSendMessage,
  useToggleReaction,
  useListChannels,
  useListUsers,
  Message,
  User,
} from '@workspace/api-client-react';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChannelSidebar } from '@/components/channel-sidebar';
import { UserDetailPanel } from '@/components/user-detail-panel';
import { MessageBubble } from '@/components/message-bubble';
import { cn } from '@/lib/utils';

export function ChatRoom({ user, onLogOut }: { user: User; onLogOut: () => void }) {
  const username = user.username;
  const { data: channels } = useListChannels();
  const { data: users } = useListUsers();

  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!activeChannelId && channels && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const { data: historyMessages, isLoading: isHistoryLoading } = useListMessages(
    { channelId: activeChannelId ?? 0 },
    { query: { enabled: activeChannelId !== null } as any },
  );

  const {
    onlineUsers,
    typingUsers,
    liveMessages,
    updatedMessages,
    isConnected,
    startTyping,
    stopTyping,
    markRead,
  } = useChatSocket(username, activeChannelId);

  const sendMessageMutation = useSendMessage();
  const toggleReactionMutation = useToggleReaction();

  const usersByUsername = useMemo(() => {
    const map = new Map<string, User>();
    users?.forEach((u) => map.set(u.username, u));
    return map;
  }, [users]);

  const allMessages = useMemo(() => {
    const map = new Map<number, Message>();
    historyMessages?.forEach((m) => map.set(m.id, m));
    liveMessages.forEach((m) => map.set(m.id, m));
    updatedMessages.forEach((m) => map.set(m.id, m));
    return Array.from(map.values())
      .filter((m) => m.channelId === activeChannelId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [historyMessages, liveMessages, updatedMessages, activeChannelId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, typingUsers]);

  // Mark other people's messages as read once they've been rendered on screen.
  useEffect(() => {
    const unread = allMessages
      .filter((m) => m.username !== username && m.status !== 'read')
      .map((m) => m.id);
    if (unread.length > 0) {
      const timeout = setTimeout(() => markRead(unread), 600);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [allMessages, username, markRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || activeChannelId === null) return;

    setContent('');
    stopTyping();

    sendMessageMutation.mutate({ data: { channelId: activeChannelId, username, content: trimmed } });
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

  const handleToggleReaction = (messageId: number, emoji: string) => {
    toggleReactionMutation.mutate({ id: messageId, data: { username, emoji } });
  };

  const otherTypingUsers = Array.from(new Set(typingUsers)).filter((u) => u !== username);
  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-sans">
      <div className="hidden md:flex h-full">
        <ChannelSidebar
          channels={channels ?? []}
          activeChannelId={activeChannelId}
          onSelectChannel={(id) => {
            setActiveChannelId(id);
            setSelectedUser(null);
          }}
          users={users ?? []}
          onlineUsers={onlineUsers}
          currentUsername={username}
          onSelectUser={setSelectedUser}
          onLogOut={onLogOut}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
        <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card/40 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-bold tracking-tight truncate">{activeChannel?.name ?? '...'}</span>
            {activeChannel?.description && (
              <span className="hidden sm:inline text-xs text-muted-foreground truncate ml-2 border-l border-border pl-2">
                {activeChannel.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground flex-shrink-0">
            <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400' : 'bg-destructive')} />
            {onlineUsers.length} online
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth"
        >
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : allMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <div className="w-16 h-16 bg-card shadow-sm border border-border rounded-full flex items-center justify-center mb-2">
                <Hash className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              <AnimatePresence initial={false}>
                {allMessages.map((msg, index) => {
                  const isSelf = msg.username === username;
                  const prevMsg = allMessages[index - 1];
                  const showHeader =
                    !prevMsg ||
                    prevMsg.username !== msg.username ||
                    new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60000;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      author={usersByUsername.get(msg.username)}
                      isSelf={isSelf}
                      showHeader={showHeader}
                      currentUsername={username}
                      onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <div className="h-6 max-w-3xl mx-auto w-full">
            <AnimatePresence>
              {otherTypingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground ml-12 mt-2">
                  <div className="flex gap-1 items-center bg-secondary px-2 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {otherTypingUsers.length === 1
                      ? `${usersByUsername.get(otherTypingUsers[0])?.displayName ?? otherTypingUsers[0]} is typing...`
                      : `${otherTypingUsers.length} people are typing...`}
                  </span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 bg-card/40 backdrop-blur border-t border-border sticky bottom-0 z-20">
          <form
            onSubmit={handleSend}
            className="max-w-3xl mx-auto relative flex items-center rounded-xl bg-secondary border border-border focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10 transition-all"
          >
            <Input
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Message...'}
              className="h-13 w-full border-0 bg-transparent px-4 pr-14 text-[14px] font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
              data-testid="input-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!content.trim() || sendMessageMutation.isPending}
              data-testid="button-send"
              className={cn(
                'absolute right-1.5 h-9 w-9 rounded-lg transition-all',
                content.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-transparent text-muted-foreground/40 hover:bg-transparent',
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="hidden lg:flex h-full">
            <UserDetailPanel
              user={selectedUser}
              isOnline={onlineUsers.includes(selectedUser.username)}
              onClose={() => setSelectedUser(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
