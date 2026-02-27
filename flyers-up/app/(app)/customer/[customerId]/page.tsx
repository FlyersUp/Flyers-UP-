import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { ProfilePageShell } from '@/components/profile/ProfilePageShell';
import { ProfileTopBar } from '@/components/profile/ProfileTopBar';
import { StatsRow } from '@/components/profile/StatsRow';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type RouteParams = { customerId?: string };

export default async function CustomerPublicForProsPage({ params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const customerId = resolved?.customerId;
  if (!customerId) return notFound();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/customer/${customerId}`)}`);

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!myProfile || (myProfile as any).role !== 'pro') return notFound();

  const admin = createAdminSupabaseClient();
  const { data: proRow } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  const proId = proRow?.id ? String((proRow as any).id) : null;
  if (!proId) return notFound();

  // Gate: only visible if there is a booking relationship.
  const { data: booking } = await admin
    .from('bookings')
    .select('id, status', { count: 'exact' })
    .eq('pro_id', proId)
    .eq('customer_id', customerId)
    .in('status', ['requested', 'accepted', 'awaiting_payment', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!booking?.id) return notFound();

  const { data: cust } = await admin
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, created_at')
    .eq('id', customerId)
    .maybeSingle();

  if (!cust) return notFound();

  const { count: jobsCompletedCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('status', 'completed');

  const memberSince = (() => {
    try {
      return cust.created_at ? new Date(String((cust as any).created_at)).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—';
    } catch {
      return '—';
    }
  })();

  const name = [ (cust as any).first_name, (cust as any).last_name ].filter(Boolean).join(' ') || 'Customer';

  return (
    <div className="theme-customer">
      <ProfilePageShell>
        <ProfileTopBar title={name} />
        <div className="pt-4 space-y-5">
          <section className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="h-[72px] w-[72px] rounded-full overflow-hidden bg-white border border-hairline shadow-sm flex items-center justify-center">
                {(cust as any).avatar_url ? (
                  <Image
                    src={String((cust as any).avatar_url)}
                    alt=""
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] object-cover"
                  />
                ) : (
                  <span className="text-2xl" aria-hidden>
                    👤
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[19px] sm:text-[22px] font-bold tracking-tight">{name}</div>
                <div className="mt-1 text-sm text-muted">Member since {memberSince}</div>
                <div className="mt-3">
                  <StatsRow
                    items={[
                      { label: 'Jobs', value: typeof jobsCompletedCount === 'number' ? String(jobsCompletedCount) : '—' },
                      { label: 'Rating', value: '—' },
                      { label: 'Reliability', value: '—' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-hairline bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</div>
              <div className="mt-2 text-sm text-muted">
                House rules and preferences will appear here when provided.
              </div>
            </div>

            <div className="mt-4">
              <Link
                href={`/pro/chat/${encodeURIComponent(String((booking as any).id))}`}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 bg-accent text-accentContrast font-semibold text-sm hover:opacity-95 transition-opacity focus-ring btn-press"
              >
                Message customer
              </Link>
              <div className="mt-2 text-xs text-muted">
                Messaging is available only for customers you have an active booking with.
              </div>
            </div>
          </section>
        </div>
      </ProfilePageShell>
    </div>
  );
}

