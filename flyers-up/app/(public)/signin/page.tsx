// No server auth — rendered statically, auth check done client-side in SignInClient.
export const dynamic = 'force-static';

import { SignInClient } from './SignInClient';

/**
 * Signin page. Params are read client-side by SignInClient via useSearchParams.
 * Client redirects already-authenticated users to /pro or /customer on mount.
 */
export default function SignInPage() {
  return <SignInClient />;
}
