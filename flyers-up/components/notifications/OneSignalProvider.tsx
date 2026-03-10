'use client';

/**
 * Fetches current user and initializes OneSignal when logged in.
 * Renders inside AppLayout so it only runs for authenticated app routes.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { OneSignalInit } from './OneSignalInit';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const get = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    void get();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {children}
      {userId && <OneSignalInit userId={userId} />}
    </>
  );
}
