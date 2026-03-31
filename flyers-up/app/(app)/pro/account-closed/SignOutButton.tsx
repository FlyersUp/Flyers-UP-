'use client';

import { useSignOutRedirect } from '@/hooks/useSignOutRedirect';

export function ProAccountClosedSignOutButton() {
  const { signingOut, signOutError, signOut } = useSignOutRedirect('/');

  return (
    <div className="pt-2 space-y-2">
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        className="text-sm font-medium text-accent underline disabled:opacity-50"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
      {signOutError ? <p className="text-xs text-danger">{signOutError}</p> : null}
    </div>
  );
}
