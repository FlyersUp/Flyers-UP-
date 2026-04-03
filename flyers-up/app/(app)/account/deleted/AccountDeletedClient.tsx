'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function AccountDeletedClient() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      await supabase.auth.signOut();
      setDone(true);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-text">
      <h1 className="text-2xl font-semibold tracking-tight">Account permanently deleted</h1>
      <p className="text-sm text-muted leading-relaxed">
        This account has been removed and anonymized. Required booking and payment records are retained without personal
        identifiers where possible.
      </p>
      <p className="text-sm text-muted leading-relaxed">
        {done ? 'You have been signed out.' : 'Signing you out…'}
      </p>
      <a href="/" className="inline-block text-sm font-medium text-accent underline">
        Back to home
      </a>
    </div>
  );
}
