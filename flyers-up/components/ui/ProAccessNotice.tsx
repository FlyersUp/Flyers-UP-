import Link from 'next/link';

export function ProAccessNotice({
  nextHref,
  signedIn = true,
}: {
  nextHref: string;
  signedIn?: boolean;
}) {
  const next = nextHref.startsWith('/') ? nextHref : '/pro/settings';
  const roleHref = `/onboarding/role?next=${encodeURIComponent(next)}`;

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface2 p-4">
      <div className="text-sm font-medium text-text">Pro access required</div>
      <div className="mt-1 text-sm text-muted">
        {signedIn
          ? "You’re signed in as a customer. Switch your role to Pro to manage these settings."
          : 'Please sign in, then choose Pro to manage these settings.'}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={roleHref}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-accent text-accentContrast hover:opacity-95"
        >
          Choose Pro →
        </Link>
        <Link
          href="/customer/settings"
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-border bg-surface text-text hover:bg-surface2"
        >
          Customer settings
        </Link>
      </div>
    </div>
  );
}

