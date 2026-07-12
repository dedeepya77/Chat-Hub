import { useState } from 'react';
import { User } from '@workspace/api-client-react';

const STORAGE_KEY = 'pulse_user';

export function useAuth() {
  const [user, setUserState] = useState<User | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  });

  const setUser = (u: User) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUserState(u);
  };

  const logOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUserState(null);
  };

  return { user, setUser, logOut };
}
