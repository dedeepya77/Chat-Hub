import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useUser } from '@/hooks/use-user';
import { JoinScreen } from '@/components/join-screen';
import { ChatRoom } from '@/components/chat-room';

const queryClient = new QueryClient();

function Main() {
  const { username, setUsername } = useUser();

  if (!username) {
    return <JoinScreen onJoin={setUsername} />;
  }

  return <ChatRoom username={username} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Main />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;