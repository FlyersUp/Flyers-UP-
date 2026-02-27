import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { adminSetBookingStatusAction } from '@/app/(app)/admin/_actions';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeUuidOrNull(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

const STATUS_OPTIONS = ['requested', 'accepted', 'declined', 'awaiting_payment', 'completed', 'cancelled'] as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser('/admin/bookings');

  const sp = await searchParams;
  const q = (pickFirst(sp.q) ?? '').trim();
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);

  const admin = createAdminSupabaseClient();

  let rows: any[] = [];
  if (!q) {
    const { data } = await admin
      .from('bookings')
      .select('id, status, service_date, service_time, address, notes, customer_id, pro_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    rows = data ?? [];
  } else {
    const asId = normalizeUuidOrNull(q);
    let query = admin
      .from('bookings')
      .select('id, status, service_date, service_time, address, notes, customer_id, pro_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (asId) {
      // Match booking id OR customer id OR pro id
      query = query.or(`id.eq.${asId},customer_id.eq.${asId},pro_id.eq.${asId}`);
    } else {
      // Address search (best-effort)
      query = query.ilike('address', `%${q}%`);
    }

    const { data } = await query;
    rows = data ?? [];
  }

  const bookingIds = rows.map((b) => String(b.id));
  const customerIds = Array.from(new Set(rows.map((b) => String(b.customer_id)).filter(Boolean)));
  const proIds = Array.from(new Set(rows.map((b) => String(b.pro_id)).filter(Boolean)));

  const customerById = new Map<string, { name: string | null; email: string | null }>();
  if (customerIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', customerIds);
    (profs ?? []).forEach((p: any) => {
      customerById.set(String(p.id), {
        name: typeof p.full_name === 'string' ? p.full_name : null,
        email: typeof p.email === 'string' ? p.email : null,
      });
    });
  }

  const proByServiceProId = new Map<string, { displayName: string | null; userId: string | null }>();
  if (proIds.length > 0) {
    const { data: pros } = await admin
      .from('service_pros')
      .select('id, display_name, user_id')
      .in('id', proIds);
    (pros ?? []).forEach((p: any) => {
      proByServiceProId.set(String(p.id), {
        displayName: typeof p.display_name === 'string' ? p.display_name : null,
        userId: typeof p.user_id === 'string' ? p.user_id : null,
      });
    });
  }

  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Bookings</h1>
            <p className="mt-1 text-sm text-muted">
              Search by booking id, customer id, pro id, or address (best-effort). Latest bookings shown by default.
            </p>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/admin">
            ← Admin home
          </Link>
        </div>

        {ok ? (
          <div className="mt-4 p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {ok}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>
        ) : null}

        <form className="mt-5 flex gap-2" action="/admin/bookings" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search booking/customer/pro UUID, or address…"
            className="flex-1 w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-muted/70"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-accent text-accentContrast font-medium hover:opacity-95">
            Search
          </button>
          <Link href="/admin/bookings" className="px-4 py-2 rounded-lg bg-surface2 text-text font-medium hover:bg-surface">
            Reset
          </Link>
        </form>

        <div className="mt-6 overflow-hidden rounded-[18px] border border-hairline bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Booking</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Pro</th>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Manual override</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((b: any) => {
                  const id = String(b.id);
                  const cust = customerById.get(String(b.customer_id)) ?? { name: null, email: null };
                  const pro = proByServiceProId.get(String(b.pro_id)) ?? { displayName: null, userId: null };
                  const returnTo = q ? `/admin/bookings?q=${encodeURIComponent(q)}` : '/admin/bookings';

                  return (
                    <tr key={id} className="border-t border-hairline">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text truncate max-w-[24ch]" title={id}>
                          {id}
                        </div>
                        <div className="text-xs text-muted/80 truncate max-w-[32ch]" title={b.address ?? ''}>
                          {b.address ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{cust.name || 'Customer'}</div>
                        <div className="text-xs text-muted/80 truncate max-w-[28ch]" title={cust.email ?? ''}>
                          {cust.email ?? b.customer_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{pro.displayName || 'Service Pro'}</div>
                        <div className="text-xs text-muted/80 truncate max-w-[28ch]" title={pro.userId ?? ''}>
                          {pro.userId ?? b.pro_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">
                        {b.service_date ? `${b.service_date} ${b.service_time ?? ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-hairline bg-surface2 px-2 py-0.5 text-xs font-medium">
                          {String(b.status ?? '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={adminSetBookingStatusAction} className="flex items-center gap-2">
                          <input type="hidden" name="bookingId" value={id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <select
                            name="status"
                            defaultValue={String(b.status ?? 'requested')}
                            className="px-2 py-1.5 rounded-lg bg-surface border border-border text-text text-sm"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface2 text-text font-medium"
                          >
                            Apply
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {(rows ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={6}>
                      No bookings found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

