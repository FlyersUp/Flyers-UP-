import Link from 'next/link';

export function SignInNotice({ nextHref }: { nextHref: string }) {
  const next = nextHref.startsWith('/') ? nextHref : '/customer/settings';
  const authHref = `/auth?next=${encodeURIComponent(next)}`;

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface2 p-4">
      <div className="text-sm font-medium text-text">Sign in required</div>
      <div className="mt-1 text-sm text-muted">Sign in (or create an account) to manage this setting.</div>
      <div className="mt-3">
        <Link
          href={authHref}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-accent text-accentContrast hover:opacity-95"
        >
          Sign in →
        </Link>
      </div>
    </div>
  );
}

