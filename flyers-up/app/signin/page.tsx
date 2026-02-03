import { SignInClient } from './SignInClient';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const roleRaw = pickFirst(sp.role);
  const modeRaw = pickFirst(sp.mode);
  const nextRaw = pickFirst(sp.next);

  const initialRole = roleRaw === 'pro' ? 'pro' : 'customer';
  const initialMode = modeRaw === 'signup' ? 'signup' : null;

  return <SignInClient initialRole={initialRole} initialMode={initialMode} nextParam={nextRaw ?? null} />;
}
