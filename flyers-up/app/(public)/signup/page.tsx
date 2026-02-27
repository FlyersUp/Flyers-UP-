// No server auth — rendered statically, auth check done client-side in SignUpClient.
export const dynamic = 'force-static';

import { Suspense } from 'react';
import { SignUpClient } from './SignUpClient';

/**
 * Signup page. Params are read client-side by SignUpClient via useSearchParams.
 * Client redirects already-authenticated users to /pro or /customer on mount.
 */
export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading…</div>}>
      <SignUpClient />
    </Suspense>
  );
}
