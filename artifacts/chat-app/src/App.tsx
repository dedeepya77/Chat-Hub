import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { AuthScreen } from '@/components/auth-screen';
import { ChatRoom } from '@/components/chat-room';

const queryClient = new QueryClient();

function Main() {
  const { user, setUser, logOut } = useAuth();

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return <ChatRoom user={user} onLogOut={logOut} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Main />
      <Toaster position="top-right" theme="dark" />
    </QueryClientProvider>
  );
}

export default App;
