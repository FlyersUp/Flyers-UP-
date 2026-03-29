import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';
import { RECURRING_FRIENDLY_OCCUPATION_SLUGS } from '@/lib/recurring/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const { data } = await admin.from('recurring_occupations').select('*').eq('pro_user_id', pr.userId);
  const rows = data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      occupations: RECURRING_FRIENDLY_OCCUPATION_SLUGS.map((slug) => ({ occupation_slug: slug, is_enabled: true })),
      defaults: true,
    });
  }
  return NextResponse.json({ ok: true, occupations: rows, defaults: false });
}

const putSchema = z.object({
  occupations: z.array(z.object({ occupation_slug: z.string().min(1).max(120), is_enabled: z.boolean() })),
});

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

  await admin.from('recurring_occupations').delete().eq('pro_user_id', pr.userId);

  const now = new Date().toISOString();
  if (parsed.data.occupations.length > 0) {
    const { error } = await admin.from('recurring_occupations').insert(
      parsed.data.occupations.map((o) => ({
        pro_user_id: pr.userId,
        occupation_slug: o.occupation_slug,
        is_enabled: o.is_enabled,
        created_at: now,
        updated_at: now,
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = await admin.from('recurring_occupations').select('*').eq('pro_user_id', pr.userId);
  return NextResponse.json({ ok: true, occupations: data ?? [] });
}
