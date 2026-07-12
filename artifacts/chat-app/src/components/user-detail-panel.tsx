import { motion } from 'framer-motion';
import { Circle, Mail, X } from 'lucide-react';
import { User } from '@workspace/api-client-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { avatarColorClasses } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';

export function UserDetailPanel({
  user,
  isOnline,
  onClose,
}: {
  user: User;
  isOnline: boolean;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="w-72 border-l border-border bg-card flex-shrink-0 flex flex-col h-full"
    >
      <div className="h-16 border-b border-border flex items-center justify-between px-5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Profile
        </span>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} data-testid="button-close-profile">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-6 flex flex-col items-center text-center border-b border-border">
        <div className="relative mb-4">
          <Avatar className="h-20 w-20 text-lg">
            <AvatarFallback className={cn(avatarColorClasses(user.avatarColor), 'text-xl')}>
              {user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card',
              isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/50',
            )}
          />
        </div>
        <h3 className="font-bold text-lg text-foreground">{user.displayName}</h3>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Circle className={cn('w-2 h-2 fill-current', isOnline ? 'text-emerald-400' : 'text-muted-foreground/50')} />
          {isOnline ? 'Online now' : 'Offline'}
        </div>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Role
          </h4>
          <p className="text-sm text-foreground font-medium">{user.title || 'Team member'}</p>
        </div>
        {user.bio && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              About
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed">{user.bio}</p>
          </div>
        )}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> Contact
          </h4>
          <p className="text-sm text-foreground/80">{user.username}@pulse.chat</p>
        </div>
      </div>
    </motion.div>
  );
}
