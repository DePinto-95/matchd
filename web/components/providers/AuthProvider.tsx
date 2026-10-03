'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    initialize().then((cleanup) => {
      // If the effect was already cleaned up (e.g. React Strict Mode's
      // double-invoke in dev) before this resolved, tear down immediately
      // instead of leaking an orphaned onAuthStateChange subscription.
      if (cancelled) {
        cleanup();
      } else {
        unsub = cleanup;
      }
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [initialize]);

  return <>{children}</>;
}
