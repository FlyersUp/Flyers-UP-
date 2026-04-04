import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getProDashboardMetrics } from '@/lib/pro-dashboard/metrics';
import { getPricingInsights } from '@/lib/pro-dashboard/insights';
import { getPriceAdjustmentSuggestion } from '@/lib/pro-dashboard/recommendations';
import type { ProDashboardMetricsRange } from '@/lib/pro-dashboard/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseRange(raw: string | null): ProDashboardMetricsRange {
  if (raw === '7d' || raw === '30d' || raw === 'all') return raw;
  return 'all';
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'pro') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get('range'));

    const bundle = await getProDashboardMetrics(user.id, { range });
    if (!bundle) {
      return NextResponse.json({
        ok: true,
        metrics: null,
        insights: [],
        recommendations: null,
        context: { occupationSlug: null },
        range,
      });
    }

    const insights = getPricingInsights(bundle.metrics, bundle.context);
    const recommendations = getPriceAdjustmentSuggestion(bundle.metrics, bundle.context);

    return NextResponse.json({
      ok: true,
      metrics: bundle.metrics,
      insights,
      recommendations,
      context: bundle.context,
      range: bundle.range,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
