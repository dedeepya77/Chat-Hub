import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowRight, Loader2, Radio, Sparkles, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useLogin,
  useSignup,
  useListUsers,
  User,
} from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarColorClasses } from '@/lib/avatar-colors';

const loginSchema = z.object({
  username: z.string().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

const signupSchema = z.object({
  displayName: z.string().min(1, 'Enter your name').max(64),
  username: z
    .string()
    .min(2, 'At least 2 characters')
    .max(32)
    .regex(/^[a-z0-9_]+$/i, 'Letters, numbers, and underscores only'),
  password: z.string().min(4, 'At least 4 characters').max(128),
});

const DEMO_PASSWORD = 'pulse123';

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-12 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-accent/40 blur-3xl" />
      <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-white">Pulse</span>
      </div>

      <div className="relative z-10 space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
          Where the team's<br />conversation lives.
        </h1>
        <p className="text-white/80 text-base leading-relaxed max-w-sm">
          Five channels, real-time presence, typing indicators, and reactions —
          built for teams who move fast together.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-3 text-white/90 text-sm font-medium">
            <Radio className="w-4 h-4" /> Live messages over Socket.io
          </div>
          <div className="flex items-center gap-3 text-white/90 text-sm font-medium">
            <Users2 className="w-4 h-4" /> Presence &amp; typing, in real time
          </div>
          <div className="flex items-center gap-3 text-white/90 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Reactions, read receipts, and more
          </div>
        </div>
      </div>

      <p className="relative z-10 text-xs font-medium text-white/60">
        &copy; {new Date().getFullYear()} Pulse Studio
      </p>
    </div>
  );
}

function DemoAccountPicker({
  users,
  onPick,
}: {
  users: User[] | undefined;
  onPick: (user: User) => void;
}) {
  if (!users || users.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          or try a demo account
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {users.slice(0, 6).map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onPick(user)}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-left transition-colors hover:bg-secondary hover:border-primary/40"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className={avatarColorClasses(user.avatarColor)}>
                {user.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-foreground">
                {user.displayName}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">@{user.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { data: users } = useListUsers();
  const loginMutation = useLogin();
  const signupMutation = useSignup();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: '', username: '', password: '' },
  });

  const handleDemoPick = (user: User) => {
    setMode('login');
    loginForm.setValue('username', user.username, { shouldValidate: true });
    loginForm.setValue('password', DEMO_PASSWORD, { shouldValidate: true });
  };

  const handleLogin = loginForm.handleSubmit((values) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (user) => onAuthenticated(user),
        onError: () => {
          toast.error('Invalid username or password');
          loginForm.setError('password', { message: 'Invalid username or password' });
        },
      },
    );
  });

  const handleSignup = signupForm.handleSubmit((values) => {
    signupMutation.mutate(
      { data: values },
      {
        onSuccess: (user) => onAuthenticated(user),
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'Could not create account';
          toast.error(message);
          signupForm.setError('username', { message: 'That username is already taken' });
        },
      },
    );
  });

  return (
    <div className="min-h-[100dvh] w-full flex bg-background font-sans">
      <BrandPanel />

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-10 relative">
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">Pulse</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Log in to jump back into the conversation.'
                : 'Sign up to join the team chat.'}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Log in</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign up</TabsTrigger>
            </TabsList>

            <React.Fragment>
              <TabsContent value="login">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-2"
                >
                  <Form {...loginForm}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. amara" autoComplete="username" data-testid="input-username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="current-password" data-testid="input-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full h-11 font-semibold"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Log in <ArrowRight className="w-4 h-4 ml-1.5" /></>
                        )}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6">
                    <DemoAccountPicker users={users} onPick={handleDemoPick} />
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="signup">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-2"
                >
                  <Form {...signupForm}>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" autoComplete="name" data-testid="input-display-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="jane" autoComplete="username" data-testid="input-signup-username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" data-testid="input-signup-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full h-11 font-semibold"
                        disabled={signupMutation.isPending}
                        data-testid="button-signup"
                      >
                        {signupMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Create account <ArrowRight className="w-4 h-4 ml-1.5" /></>
                        )}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              </TabsContent>
            </React.Fragment>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
