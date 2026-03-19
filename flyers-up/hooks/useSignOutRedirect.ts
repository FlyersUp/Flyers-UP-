'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface UseSignOutRedirectResult {
  signingOut: boolean;
  signOutError: string | null;
  signOut: () => Promise<void>;
}

/**
 * Shared sign-out flow used by account/settings entry points.
 */
export function useSignOutRedirect(redirectTo = '/auth'): UseSignOutRedirectResult {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace(redirectTo);
    } catch {
      setSigningOut(false);
      setSignOutError('Could not sign out. Please try again.');
    }
  }, [redirectTo, router, signingOut]);

  return { signingOut, signOutError, signOut };
}
