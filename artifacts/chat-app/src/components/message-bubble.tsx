import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, CheckCheck, SmilePlus } from 'lucide-react';
import { Message, User } from '@workspace/api-client-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { avatarColorClasses } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🙏'];

function StatusTicks({ status }: { status: Message['status'] }) {
  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-primary" data-testid="status-read" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" data-testid="status-delivered" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground" data-testid="status-sent" />;
}

export function MessageBubble({
  message,
  author,
  isSelf,
  showHeader,
  currentUsername,
  onToggleReaction,
}: {
  message: Message;
  author: User | undefined;
  isSelf: boolean;
  showHeader: boolean;
  currentUsername: string;
  onToggleReaction: (emoji: string) => void;
}) {
  const displayName = author?.displayName ?? message.username;
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(
    ([, usernames]) => usernames.length > 0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 group', !showHeader && 'mt-0.5', showHeader && 'mt-5')}
    >
      <div className="w-9 flex-shrink-0 flex justify-center">
        {showHeader ? (
          <Avatar className="w-9 h-9">
            <AvatarFallback className={cn(avatarColorClasses(author?.avatarColor ?? 'violet'), 'text-xs')}>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-9 text-[10px] font-medium text-muted-foreground/0 group-hover:text-muted-foreground/60 text-center leading-9 select-none transition-colors">
            {format(new Date(message.createdAt), 'HH:mm')}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-bold text-[14px] leading-none text-foreground">{displayName}</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <div className="text-[14px] text-foreground/90 leading-relaxed break-words whitespace-pre-wrap max-w-2xl">
            {message.content}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pb-0.5">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                  data-testid={`button-react-${message.id}`}
                  aria-label="Add reaction"
                >
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1.5 flex gap-0.5" side="top" align="start">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(emoji)}
                    className="text-lg leading-none p-1.5 rounded-md hover:bg-secondary transition-transform hover:scale-110"
                    data-testid={`button-emoji-${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {isSelf && (
            <div className="pb-0.5 flex-shrink-0" title={message.status}>
              <StatusTicks status={message.status} />
            </div>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactionEntries.map(([emoji, usernames]) => {
              const reactedBySelf = usernames.includes(currentUsername);
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(emoji)}
                  data-testid={`reaction-${message.id}-${emoji}`}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                    reactedBySelf
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:border-primary/30',
                  )}
                  title={usernames.join(', ')}
                >
                  <span>{emoji}</span>
                  <span>{usernames.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
