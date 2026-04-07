'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth } from '../provider';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase auth error:", error);
      setIsLoading(false);
    });

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [auth]);

  return { user, isLoading };
}
