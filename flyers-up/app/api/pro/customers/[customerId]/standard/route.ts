import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireProService } from '@/lib/recurring/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId: raw } = await params;
  const customerId = normalizeUuidOrNull(raw);
  if (!customerId) return NextResponse.json({ error: 'Invalid customer' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const now = new Date().toISOString();
  const { error } = await admin.from('pro_customer_preferences').upsert(
    {
      pro_user_id: pr.userId,
      customer_user_id: customerId,
      preference_status: 'standard',
      marked_preferred_at: null,
      updated_at: now,
    },
    { onConflict: 'pro_user_id,customer_user_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
