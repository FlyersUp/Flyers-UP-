import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';
import { parseCreateServicePackageInput } from '@/lib/service-packages/validation';
import { mapServicePackageRow, SERVICE_PACKAGE_DB_SELECT } from '@/lib/service-packages/db-map';
import { rowToPublic } from '@/types/service-packages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const { data, error } = await supabase
    .from('service_packages')
    .select(SERVICE_PACKAGE_DB_SELECT)
    .eq('pro_user_id', pr.userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const packages = (data ?? []).map((r) => rowToPublic(mapServicePackageRow(r as Record<string, unknown>)));
  return NextResponse.json({ ok: true, packages });
}

export async function POST(req: Request) {
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
    parsed = parseCreateServicePackageInput(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from('service_packages')
    .select('sort_order')
    .eq('pro_user_id', pr.userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = typeof (maxRow as { sort_order?: number } | null)?.sort_order === 'number'
    ? (maxRow as { sort_order: number }).sort_order + 1
    : 0;

  const { data: inserted, error } = await supabase
    .from('service_packages')
    .insert({
      pro_user_id: pr.userId,
      title: parsed.title,
      short_description: parsed.short_description,
      base_price_cents: parsed.base_price_cents,
      estimated_duration_minutes: parsed.estimated_duration_minutes,
      deliverables: parsed.deliverables,
      is_active: parsed.is_active ?? true,
      sort_order: nextOrder,
    })
    .select(SERVICE_PACKAGE_DB_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const pkg = rowToPublic(mapServicePackageRow(inserted as Record<string, unknown>));
  return NextResponse.json({ ok: true, package: pkg });
}
