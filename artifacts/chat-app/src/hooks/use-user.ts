import { useState } from 'react';

export function useUser() {
  const [username, setUsernameState] = useState<string | null>(() => {
    return sessionStorage.getItem('pulse_username');
  });

  const setUsername = (name: string) => {
    sessionStorage.setItem('pulse_username', name);
    setUsernameState(name);
  };

  const clearUsername = () => {
    sessionStorage.removeItem('pulse_username');
    setUsernameState(null);
  };

  return { username, setUsername, clearUsername };
}