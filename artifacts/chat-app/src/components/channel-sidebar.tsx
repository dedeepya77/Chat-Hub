import { Activity, Circle, Hash, LogOut, Users } from 'lucide-react';
import { Channel, User } from '@workspace/api-client-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { avatarColorClasses } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';

export function ChannelSidebar({
  channels,
  activeChannelId,
  onSelectChannel,
  users,
  onlineUsers,
  currentUsername,
  onSelectUser,
  onLogOut,
}: {
  channels: Channel[];
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  users: User[];
  onlineUsers: string[];
  currentUsername: string;
  onSelectUser: (user: User) => void;
  onLogOut: () => void;
}) {
  const onlineSet = new Set(onlineUsers);
  const online = users.filter((u) => onlineSet.has(u.username));
  const offline = users.filter((u) => !onlineSet.has(u.username));

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full flex-shrink-0">
      <div className="h-16 border-b border-border flex items-center px-5 gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm shadow-primary/30">
          <Activity className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="font-extrabold text-lg tracking-tight">Pulse</span>
      </div>

      <div className="flex-1 overflow-y-auto py-5">
        <div className="px-5 mb-6">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            Channels
          </h2>
          <ul className="space-y-0.5 -mx-2">
            {channels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <li key={channel.id}>
                  <button
                    onClick={() => onSelectChannel(channel.id)}
                    data-testid={`button-channel-${channel.slug}`}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <Hash className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Team ({online.length}/{users.length})
          </h2>
          <ul className="space-y-2.5">
            {[...online, ...offline].map((u) => {
              const isOnline = onlineSet.has(u.username);
              return (
                <li key={u.id}>
                  <button
                    onClick={() => onSelectUser(u)}
                    data-testid={`button-user-${u.username}`}
                    className="w-full flex items-center gap-2.5 group"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className={cn(avatarColorClasses(u.avatarColor), 'text-[11px]')}>
                          {u.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                          isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/40',
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium truncate transition-colors',
                        isOnline ? 'text-foreground' : 'text-muted-foreground',
                        'group-hover:text-primary',
                      )}
                    >
                      {u.displayName}
                      {u.username === currentUsername && (
                        <span className="text-muted-foreground font-normal"> (you)</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Circle className="w-2 h-2 fill-current text-emerald-400" />
          Connected
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onLogOut} data-testid="button-logout">
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
