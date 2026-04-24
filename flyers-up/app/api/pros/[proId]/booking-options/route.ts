import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isServiceProBookableByCustomers } from '@/lib/pro/pro-bookability';
import { mapServicePackageRow, SERVICE_PACKAGE_DB_SELECT } from '@/lib/service-packages/db-map';
import { rowToPublic } from '@/types/service-packages';
import { addonRowEligibleForSubcategory } from '@/lib/bookings/booking-request-scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AddonOption = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  service_subcategory_id: string | null;
};

function packageEligibleForSubcategory(
  pkg: { service_subcategory_id?: string | null },
  subcategoryId: string | null | undefined
): boolean {
  const scoped = pkg.service_subcategory_id?.trim() || null;
  if (!scoped) return true;
  const sub = subcategoryId?.trim() || null;
  return sub != null && scoped === sub;
}

/**
 * Active add-ons and packages for the booking form, scoped by service menu + optional subcategory.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ proId: string }> }) {
  const { proId } = await ctx.params;
  const id = proId?.trim();
  if (!id) return NextResponse.json({ error: 'Missing pro id' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const serviceSlug = searchParams.get('serviceSlug')?.trim() || undefined;
  const subcategoryId = searchParams.get('subcategoryId')?.trim() || undefined;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const bookable = await isServiceProBookableByCustomers(admin, id);
  if (!bookable) {
    return NextResponse.json({
      ok: true,
      occupationSlug: null,
      categorySlug: null,
      menuKey: null,
      addons: [] as AddonOption[],
      packages: [],
    });
  }

  const { data: pro, error: proErr } = await admin
    .from('service_pros')
    .select('user_id, category_id, occupation_id')
    .eq('id', id)
    .maybeSingle();
  if (proErr || !pro) {
    return NextResponse.json({
      ok: true,
      occupationSlug: null,
      categorySlug: null,
      menuKey: null,
      addons: [] as AddonOption[],
      packages: [],
    });
  }

  const proUserId = String((pro as { user_id: string }).user_id);

  let categorySlug: string | null = null;
  try {
    const { data: cat } = await admin
      .from('service_categories')
      .select('slug')
      .eq('id', (pro as { category_id?: string | null }).category_id)
      .maybeSingle();
    categorySlug = cat?.slug ? String(cat.slug) : null;
  } catch {
    categorySlug = null;
  }

  let occupationSlug: string | null = null;
  const occId = (pro as { occupation_id?: string | null }).occupation_id;
  if (occId) {
    const { data: occ } = await admin.from('occupations').select('slug').eq('id', occId).maybeSingle();
    occupationSlug = occ?.slug ? String(occ.slug) : null;
  }

  const menuKey = (serviceSlug && serviceSlug.length > 0 ? serviceSlug : categorySlug) || 'general';

  const { data: addonRows, error: addErr } = await supabase
    .from('service_addons')
    .select('id, title, description, price_cents, service_subcategory_id')
    .eq('pro_id', proUserId)
    .eq('service_category', menuKey)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (addErr) {
    return NextResponse.json({ error: addErr.message }, { status: 500 });
  }

  const addons: AddonOption[] = (addonRows || [])
    .filter((r) => addonRowEligibleForSubcategory(r as { service_subcategory_id?: string | null }, subcategoryId))
    .map((r) => ({
      id: String((r as { id: string }).id),
      title: String((r as { title?: string }).title ?? ''),
      description:
        (r as { description?: string | null }).description == null
          ? null
          : String((r as { description?: string | null }).description),
      price_cents: Math.round(Number((r as { price_cents?: number }).price_cents ?? 0)),
      service_subcategory_id:
        (r as { service_subcategory_id?: string | null }).service_subcategory_id == null ||
        (r as { service_subcategory_id?: string | null }).service_subcategory_id === ''
          ? null
          : String((r as { service_subcategory_id?: string | null }).service_subcategory_id),
    }));

  const { data: pkgRows, error: pkgErr } = await supabase
    .from('service_packages')
    .select(SERVICE_PACKAGE_DB_SELECT)
    .eq('pro_user_id', proUserId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (pkgErr) {
    return NextResponse.json({ error: pkgErr.message }, { status: 500 });
  }

  const packages = (pkgRows ?? [])
    .filter((r) => packageEligibleForSubcategory(r as { service_subcategory_id?: string | null }, subcategoryId))
    .map((r) => rowToPublic(mapServicePackageRow(r as Record<string, unknown>)));

  return NextResponse.json({
    ok: true,
    occupationSlug,
    categorySlug,
    menuKey,
    addons,
    packages,
  });
}
