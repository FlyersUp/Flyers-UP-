import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeBoroughSlug } from '@/lib/marketplace/nycBoroughs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  occupationSlug: z.string().trim().min(1),
  boroughSlug: z.string().trim().min(1),
  preferredTime: z.string().trim().max(500).optional().nullable(),
  urgency: z.enum(['asap', 'today', 'flexible']),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return Response.json({ ok: false, error: 'Customer account required' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { occupationSlug, boroughSlug: boroughInput, preferredTime, urgency, notes } = parsed.data;
  const boroughCanon = normalizeBoroughSlug(boroughInput);
  if (!boroughCanon) {
    return Response.json({ ok: false, error: 'Invalid borough' }, { status: 400 });
  }

  const { data: occ } = await supabase.from('occupations').select('slug').eq('slug', occupationSlug).maybeSingle();
  if (!occ?.slug) {
    return Response.json({ ok: false, error: 'Unknown occupation' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('match_requests')
    .insert({
      customer_id: user.id,
      occupation_slug: occupationSlug,
      borough_slug: boroughCanon,
      preferred_time: preferredTime ?? null,
      urgency,
      notes: notes ?? null,
      status: 'pending_review',
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[match-requests POST]', error);
    return Response.json({ ok: false, error: 'Could not create match request' }, { status: 500 });
  }

  return Response.json({ ok: true, id: inserted?.id });
}
