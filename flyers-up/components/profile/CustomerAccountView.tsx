import Image from 'next/image';
import Link from 'next/link';

type BookingItem = {
  id: string;
  when: string;
  proName: string;
  status: string;
  href: string;
};

function SectionTitle({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      {action ? (
        <Link href={action.href} className="text-sm font-semibold text-text hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const confirm = s === 'scheduled' || s === 'completed';
  const label = status.replaceAll('_', ' ');
  return (
    <span
      className={[
        'relative inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] uppercase tracking-wide font-medium',
        'bg-white border-hairline',
        confirm ? "pl-4 before:content-[''] before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full before:bg-accent/80 text-text" : 'text-muted',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function BookingCard({ b }: { b: BookingItem }) {
  return (
    <Link href={b.href} className="block">
      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-4 hover:shadow transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{b.proName}</div>
            <div className="mt-1 text-sm text-muted">{b.when}</div>
          </div>
          <div className="shrink-0">
            <StatusPill status={b.status} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CustomerAccountView({
  firstName,
  avatarUrl,
  memberSinceLabel,
  bookingsCount,
  savedCount,
  upcoming,
  past,
  savedPros,
}: {
  firstName: string;
  avatarUrl: string | null;
  memberSinceLabel: string;
  bookingsCount: number;
  savedCount: number;
  upcoming: BookingItem[];
  past: BookingItem[];
  savedPros: Array<{ id: string; name: string; avatarUrl: string | null; href: string }>;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="h-[72px] w-[72px] rounded-full overflow-hidden bg-white border border-hairline shadow-sm flex items-center justify-center">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={72} height={72} className="h-[72px] w-[72px] object-cover" />
            ) : (
              <span className="text-2xl" aria-hidden>
                👤
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[20px] sm:text-[22px] font-bold tracking-tight">My Account</div>
            <div className="mt-1 text-sm text-muted">
              {firstName} • Member since {memberSinceLabel}
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <div className="text-base font-semibold">{bookingsCount}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted">Bookings</div>
              </div>
              <div>
                <div className="text-base font-semibold">{savedCount}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted">Saved Pros</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Upcoming bookings" action={{ label: 'Browse services', href: '/customer/categories' }} />
        {upcoming.length ? (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
            <div className="text-sm font-semibold">No upcoming bookings</div>
            <div className="mt-1 text-sm text-muted">When you request a service, it will show here.</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle title="Past bookings" />
        {past.length ? (
          <div className="space-y-3">
            {past.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
            <div className="text-sm font-semibold">No past bookings yet</div>
            <div className="mt-1 text-sm text-muted">Completed bookings will show here.</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle title="Saved pros" />
        {savedPros.length ? (
          <div className="-mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
              {savedPros.map((p) => (
                <Link key={p.id} href={p.href} className="shrink-0 w-[220px]">
                  <div className="rounded-2xl border border-hairline bg-white shadow-sm p-4 hover:shadow transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-white border border-hairline flex items-center justify-center">
                        {p.avatarUrl ? (
                          <Image src={p.avatarUrl} alt="" width={48} height={48} className="h-12 w-12 object-cover" />
                        ) : (
                          <span aria-hidden>👤</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-muted">View profile</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
            <div className="text-sm font-semibold">No saved pros yet</div>
            <div className="mt-1 text-sm text-muted">When you save a pro, they’ll appear here.</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle title="Settings" />
        <div className="rounded-2xl border border-hairline bg-white shadow-sm overflow-hidden">
          {[
            { label: 'Account', href: '/customer/settings/account-profile' },
            { label: 'Payments', href: '/customer/settings/payment-methods' },
            { label: 'Notifications', href: '/customer/settings/notifications' },
            { label: 'Privacy', href: '/customer/settings/privacy-security' },
          ].map((it) => (
            <Link key={it.href} href={it.href} className="block">
              <div className="flex items-center justify-between px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface2 transition-colors">
                <div className="text-sm font-semibold">{it.label}</div>
                <div className="text-muted" aria-hidden>
                  ›
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

