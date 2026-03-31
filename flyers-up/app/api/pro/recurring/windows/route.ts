import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const { data, error } = await admin
    .from('recurring_availability_windows')
    .select(
      'id, pro_user_id, day_of_week, start_minute, end_minute, occupation_slug, recurring_only, is_flexible, is_active, created_at, updated_at'
    )
    .eq('pro_user_id', pr.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, windows: data ?? [] });
}

const winSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_minute: z.number().int().min(0).max(1439),
  end_minute: z.number().int().min(1).max(1440),
  occupation_slug: z.string().max(120).nullable().optional(),
  recurring_only: z.boolean().optional(),
  is_flexible: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const putSchema = z.object({ windows: z.array(winSchema) });

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

  for (const w of parsed.data.windows) {
    if (w.end_minute <= w.start_minute) {
      return NextResponse.json({ error: 'end_minute must be greater than start_minute' }, { status: 400 });
    }
  }

  await admin.from('recurring_availability_windows').delete().eq('pro_user_id', pr.userId);

  const now = new Date().toISOString();
  if (parsed.data.windows.length > 0) {
    const { error } = await admin.from('recurring_availability_windows').insert(
      parsed.data.windows.map((w) => ({
        pro_user_id: pr.userId,
        day_of_week: w.day_of_week,
        start_minute: w.start_minute,
        end_minute: w.end_minute,
        occupation_slug: w.occupation_slug ?? null,
        recurring_only: w.recurring_only ?? true,
        is_flexible: w.is_flexible ?? false,
        is_active: w.is_active ?? true,
        created_at: now,
        updated_at: now,
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = await admin
    .from('recurring_availability_windows')
    .select(
      'id, pro_user_id, day_of_week, start_minute, end_minute, occupation_slug, recurring_only, is_flexible, is_active, created_at, updated_at'
    )
    .eq('pro_user_id', pr.userId);
  return NextResponse.json({ ok: true, windows: data ?? [] });
}
