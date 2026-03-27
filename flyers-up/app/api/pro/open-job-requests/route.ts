/**
 * GET /api/pro/open-job-requests
 * Open customer job_requests for the current pro, filtered by occupation (category) and optional ZIP radius.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  jobRequestMatchesProCategory,
  normalizeUsZip5,
  zipsWithinRadiusMiles,
  isValidUsZip5,
} from '@/lib/jobRequestLocation';

export const dynamic = 'force-dynamic';

const DEFAULT_RADIUS_MILES = 25;
const RADIUS_OPTIONS = [5, 10, 15, 25, 35, 50] as const;

function clampRadius(m: number): number {
  if (!Number.isFinite(m) || m <= 0) return DEFAULT_RADIUS_MILES;
  return Math.min(100, Math.max(1, m));
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: pro } = await supabase
      .from('service_pros')
      .select('id, category_id, service_area_zip, location, travel_radius_miles, service_radius')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!pro) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 403 });
    }

    const proRow = pro as {
      id: string;
      category_id: string;
      service_area_zip: string | null;
      location: string | null;
      travel_radius_miles: number | null;
      service_radius: number | null;
    };

    const { data: category } = await supabase
      .from('service_categories')
      .select('slug, name')
      .eq('id', proRow.category_id)
      .maybeSingle();

    const cat = category as { slug: string; name: string } | null;
    if (!cat?.slug) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    const qp = req.nextUrl.searchParams;
    const zipParam = qp.get('zip')?.trim() || '';
    const radiusParam = qp.get('radiusMiles');
    const parsedRadius = radiusParam != null ? Number(radiusParam) : NaN;

    const profileZip =
      normalizeUsZip5(proRow.service_area_zip) ?? normalizeUsZip5(proRow.location ?? '');

    let effectiveZip: string | null = null;
    let zipWarning: string | undefined;
    if (zipParam) {
      const z = normalizeUsZip5(zipParam);
      if (z && isValidUsZip5(z)) effectiveZip = z;
      else zipWarning = 'That ZIP is not valid. Using your profile ZIP or showing all jobs in your category.';
    }
    if (!effectiveZip && profileZip && isValidUsZip5(profileZip)) {
      effectiveZip = profileZip;
    }

    const radiusMiles = clampRadius(
      Number.isFinite(parsedRadius)
        ? parsedRadius
        : Number(proRow.travel_radius_miles ?? proRow.service_radius ?? DEFAULT_RADIUS_MILES)
    );

    const { data: rows, error } = await supabase
      .from('job_requests')
      .select(
        'id, title, description, service_category, location, location_zip, budget_min, budget_max, preferred_date, preferred_time, created_at, expires_at, photos'
      )
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[pro/open-job-requests]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allowedZips = effectiveZip ? zipsWithinRadiusMiles(effectiveZip, radiusMiles) : null;

    const filtered = (rows ?? []).filter((row) => {
      const r = row as {
        service_category: string;
        location_zip: string | null;
        location: string | null;
      };
      if (!jobRequestMatchesProCategory(r.service_category, cat.slug, cat.name)) return false;
      if (!allowedZips) return true;
      const reqZip = normalizeUsZip5(r.location_zip) ?? normalizeUsZip5(r.location ?? '');
      if (!reqZip) return false;
      return allowedZips.has(reqZip);
    });

    return NextResponse.json(
      {
        requests: filtered,
        filter: {
          categorySlug: cat.slug,
          categoryName: cat.name,
          zip: effectiveZip,
          zipValid: Boolean(effectiveZip),
          radiusMiles,
          profileZip: profileZip && isValidUsZip5(profileZip) ? profileZip : null,
          zipWarning,
          radiusOptions: [...RADIUS_OPTIONS],
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[pro/open-job-requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
