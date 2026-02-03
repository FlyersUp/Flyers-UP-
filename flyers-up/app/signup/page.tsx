import { SignUpClient } from './SignUpClient';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const roleRaw = pickFirst(sp.role);
  const initialRole = roleRaw === 'pro' ? 'pro' : 'customer';
  return <SignUpClient initialRole={initialRole} />;
}
