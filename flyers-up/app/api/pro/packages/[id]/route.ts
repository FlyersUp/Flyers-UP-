import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';
import { parseUpdateServicePackageInput } from '@/lib/service-packages/validation';
import { mapServicePackageRow, SERVICE_PACKAGE_DB_SELECT } from '@/lib/service-packages/db-map';
import { rowToPublic } from '@/types/service-packages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
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

  let parsed;
  try {
    parsed = parseUpdateServicePackageInput(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data: existing, error: exErr } = await supabase
    .from('service_packages')
    .select(SERVICE_PACKAGE_DB_SELECT)
    .eq('id', packageId)
    .eq('pro_user_id', pr.userId)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.short_description !== undefined) patch.short_description = parsed.short_description;
  if (parsed.base_price_cents !== undefined) patch.base_price_cents = parsed.base_price_cents;
  if (parsed.estimated_duration_minutes !== undefined) {
    patch.estimated_duration_minutes = parsed.estimated_duration_minutes;
  }
  if (parsed.deliverables !== undefined) patch.deliverables = parsed.deliverables;
  if (parsed.is_active !== undefined) patch.is_active = parsed.is_active;
  if (parsed.sort_order !== undefined) patch.sort_order = parsed.sort_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({
      ok: true,
      package: rowToPublic(mapServicePackageRow(existing as Record<string, unknown>)),
    });
  }

  const { data: updated, error } = await supabase
    .from('service_packages')
    .update(patch)
    .eq('id', packageId)
    .eq('pro_user_id', pr.userId)
    .select(SERVICE_PACKAGE_DB_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, package: rowToPublic(mapServicePackageRow(updated as Record<string, unknown>)) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const packageId = id?.trim();
  if (!packageId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const { error } = await supabase.from('service_packages').delete().eq('id', packageId).eq('pro_user_id', pr.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
