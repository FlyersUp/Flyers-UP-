import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { CustomerAccountView } from '@/components/profile/CustomerAccountView';

export const dynamic = 'force-dynamic';

function fmtMemberSince(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Faccount');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/auth?next=%2Faccount');
  if ((profile as any).role !== 'customer') redirect('/pro');

  const admin = createAdminSupabaseClient();

  const { data: upcomingRows } = await admin
    .from('bookings')
    .select('id, service_date, service_time, status, pro_id')
    .eq('customer_id', user.id)
    .in('status', ['requested', 'accepted', 'awaiting_payment'])
    .order('service_date', { ascending: true })
    .order('service_time', { ascending: true })
    .limit(20);

  const { data: pastRows } = await admin
    .from('bookings')
    .select('id, service_date, service_time, status, pro_id')
    .eq('customer_id', user.id)
    .in('status', ['completed', 'cancelled', 'declined'])
    .order('service_date', { ascending: false })
    .order('service_time', { ascending: false })
    .limit(20);

  const allProIds = Array.from(
    new Set([...(upcomingRows ?? []).map((b: any) => String(b.pro_id)), ...(pastRows ?? []).map((b: any) => String(b.pro_id))])
  ).filter(Boolean);

  const { data: proRows } = allProIds.length
    ? await admin.from('service_pros').select('id, display_name, logo_url').in('id', allProIds)
    : { data: [] as any[] };

  const proById = new Map<string, { name: string; avatarUrl: string | null }>();
  for (const p of proRows ?? []) {
    proById.set(String((p as any).id), {
      name: String((p as any).display_name ?? 'Service Pro'),
      avatarUrl: typeof (p as any).logo_url === 'string' ? (p as any).logo_url : null,
    });
  }

  const upcoming = (upcomingRows ?? []).map((b: any) => {
    const pro = proById.get(String(b.pro_id));
    const when = `${String(b.service_date)} at ${String(b.service_time)}`;
    const status = String(b.status || '');
    const uiStatus = status.toLowerCase() === 'accepted' ? 'scheduled' : status;
    return {
      id: String(b.id),
      when,
      proName: pro?.name ?? 'Service Pro',
      status: uiStatus,
      href: `/customer/chat/${encodeURIComponent(String(b.id))}`,
    };
  });

  const past = (pastRows ?? []).map((b: any) => {
    const pro = proById.get(String(b.pro_id));
    const when = `${String(b.service_date)} at ${String(b.service_time)}`;
    return {
      id: String(b.id),
      when,
      proName: pro?.name ?? 'Service Pro',
      status: String(b.status || ''),
      href: `/customer/chat/${encodeURIComponent(String(b.id))}`,
      proId: b.pro_id ? String(b.pro_id) : undefined,
    };
  });

  // Saved pros: best-effort (table may not exist in older DBs).
  let savedProIds: string[] = [];
  try {
    const prefs = await admin.from('user_booking_preferences').select('favorite_pro_ids').eq('user_id', user.id).maybeSingle();
    if (prefs.data && Array.isArray((prefs.data as any).favorite_pro_ids)) {
      savedProIds = ((prefs.data as any).favorite_pro_ids as any[]).map((x) => String(x));
    }
  } catch {
    savedProIds = [];
  }

  const { data: savedRows } = savedProIds.length
    ? await admin.from('service_pros').select('id, display_name, logo_url').in('id', savedProIds.slice(0, 20))
    : { data: [] as any[] };

  const savedPros = (savedRows ?? []).map((p: any) => ({
    id: String(p.id),
    name: String(p.display_name ?? 'Service Pro'),
    avatarUrl: typeof p.logo_url === 'string' ? p.logo_url : null,
    href: `/customer/pros/${encodeURIComponent(String(p.id))}`,
  }));

  return (
    <AppLayout mode="customer">
      <div className="max-w-[720px] mx-auto px-4 py-6 theme-customer">
        <CustomerAccountView
          firstName={[ (profile as any).first_name, (profile as any).last_name ].filter(Boolean).join(' ') || 'Account'}
          avatarUrl={typeof (profile as any).avatar_url === 'string' ? (profile as any).avatar_url : null}
          memberSinceLabel={fmtMemberSince((profile as any).created_at ?? null)}
          bookingsCount={upcoming.length + past.length}
          savedCount={savedPros.length}
          upcoming={upcoming}
          past={past}
          savedPros={savedPros}
        />
      </div>
    </AppLayout>
  );
}

