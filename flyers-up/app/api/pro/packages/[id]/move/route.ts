import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';
import { computeReorderUpdates } from '@/lib/service-packages/reorder';
import { mapServicePackageRow } from '@/lib/service-packages/db-map';
import { rowToPublic } from '@/types/service-packages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  direction: z.enum(['up', 'down']),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const packageId = id?.trim();
  if (!packageId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from('service_packages')
    .select('id, sort_order')
    .eq('pro_user_id', pr.userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ordered = (rows ?? []).map((r) => ({
    id: String((r as { id: string }).id),
    sort_order: Number((r as { sort_order: number }).sort_order),
  }));

  const updates = computeReorderUpdates(ordered, packageId, parsed.data.direction);
  if (!updates) return NextResponse.json({ ok: true, moved: false });

  for (const u of updates) {
    const { error: upErr } = await supabase
      .from('service_packages')
      .update({ sort_order: u.sort_order })
      .eq('id', u.id)
      .eq('pro_user_id', pr.userId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: full } = await supabase.from('service_packages').select('*').eq('pro_user_id', pr.userId).order('sort_order', { ascending: true });

  return NextResponse.json({
    ok: true,
    moved: true,
    packages: (full ?? []).map((r) => rowToPublic(mapServicePackageRow(r as Record<string, unknown>))),
  });
}
