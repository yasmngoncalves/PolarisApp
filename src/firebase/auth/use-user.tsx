"use client";

import { User, onIdTokenChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useAuth } from '../provider';

/**
 * @deprecated The `useUser` hook is now exported from `@/firebase/provider.tsx`. 
 * Please update your imports to `import { useUser } from '@/firebase';`.
 * This hook will be removed in a future version.
 */
export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading };
}
