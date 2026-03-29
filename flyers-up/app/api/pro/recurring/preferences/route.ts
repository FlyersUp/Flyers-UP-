import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';
import { getOrCreateRecurringPreferences, refreshRecurringCustomerCount } from '@/lib/recurring/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const row = await getOrCreateRecurringPreferences(admin, pr.userId);
  return NextResponse.json({ ok: true, preferences: row });
}

const putSchema = z
  .object({
    recurring_enabled: z.boolean().optional(),
    max_recurring_customers: z.number().int().min(0).max(100).optional(),
    only_preferred_clients_can_request: z.boolean().optional(),
    require_mutual_preference_for_auto_approval: z.boolean().optional(),
    manual_approval_required: z.boolean().optional(),
    allow_auto_approval_for_mutual_preference: z.boolean().optional(),
    recurring_only_windows_enabled: z.boolean().optional(),
    timezone: z.string().min(3).max(80).nullable().optional(),
  })
  .strict();

export async function PUT(req: Request) {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  await getOrCreateRecurringPreferences(admin, pr.userId);
  const now = new Date().toISOString();
  const { error } = await admin
    .from('recurring_preferences')
    .update({ ...parsed.data, updated_at: now })
    .eq('pro_user_id', pr.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await refreshRecurringCustomerCount(admin, pr.userId);
  const row = await getOrCreateRecurringPreferences(admin, pr.userId);
  return NextResponse.json({ ok: true, preferences: row });
}
