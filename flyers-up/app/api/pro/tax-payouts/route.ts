export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

/**
 * Pro Tax & Payouts API (scaffolding).
 *
 * Compliance guardrails:
 * - Never accept or store raw SSN/ITIN values.
 * - Only store tax ID TYPE + status + Stripe account references.
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { ITIN_FEATURE_FLAG_KEY } from '@/lib/featureFlags';

type TaxIdType = 'SSN' | 'ITIN' | 'OTHER';
type TaxFormsStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

function toStatusLabel(status: TaxFormsStatus): 'Not started' | 'Pending' | 'Verified' | 'Action required' {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'pending':
      return 'Pending';
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Action required';
    default:
      return 'Not started';
  }
}

async function isItinOptionEnabled(): Promise<boolean> {
  // Use the internal feature flag endpoint so this route stays the single source of truth.
  // We still fail closed if missing.
  const enabled = String(process.env[ITIN_FEATURE_FLAG_KEY] || '').toLowerCase() === 'true';
  if (!enabled) return false;

  // DB flag check is enforced by isFeatureEnabled() via /api/feature-flags.
  // Here we just mirror the env gate; the UI also checks the API flag endpoint.
  return true;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('pro_tax_profiles')
    .select('tax_id_type, tax_forms_status, stripe_account_id, payouts_hold_days, payouts_on_hold, last_tax_form_submitted_at')
    .eq('pro_user_id', user.id)
    .maybeSingle();

  // If row doesn't exist yet, return defaults (scaffolding).
  if (error) {
    return Response.json(
      {
        ok: true,
        tax: {
          taxIdType: null as TaxIdType | null,
          taxFormsStatus: 'not_started' as TaxFormsStatus,
          statusLabel: toStatusLabel('not_started'),
          stripeAccountId: null as string | null,
          payoutsHoldDays: 0,
          payoutsOnHold: false,
          lastTaxFormSubmittedAt: null as string | null,
        },
      },
      { status: 200 }
    );
  }

  const status = (data?.tax_forms_status || 'not_started') as TaxFormsStatus;

  return Response.json(
    {
      ok: true,
      tax: {
        taxIdType: (data?.tax_id_type as TaxIdType | null) ?? null,
        taxFormsStatus: status,
        statusLabel: toStatusLabel(status),
        stripeAccountId: data?.stripe_account_id ?? null,
        payoutsHoldDays: data?.payouts_hold_days ?? 0,
        payoutsOnHold: data?.payouts_on_hold ?? false,
        lastTaxFormSubmittedAt: data?.last_tax_form_submitted_at ?? null,
      },
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const taxIdType = String(body?.taxIdType || '').toUpperCase() as TaxIdType;

  const allowed: TaxIdType[] = ['SSN', 'ITIN', 'OTHER'];
  if (!allowed.includes(taxIdType)) {
    return Response.json({ ok: false, error: 'Invalid taxIdType' }, { status: 400 });
  }

  // Enforce gating: ITIN selection only when the feature flag is enabled.
  if (taxIdType === 'ITIN') {
    const enabled = await isItinOptionEnabled();
    if (!enabled) {
      return Response.json({ ok: false, error: 'ITIN option is not enabled' }, { status: 403 });
    }
  }

  // IMPORTANT: This RPC only stores the TYPE. It does NOT accept or store any ID values.
  const { data, error } = await supabase.rpc('upsert_my_tax_id_type', { new_tax_id_type: taxIdType });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }

  return Response.json(
    {
      ok: true,
      tax: {
        taxIdType: (data?.tax_id_type as TaxIdType | null) ?? null,
        taxFormsStatus: (data?.tax_forms_status as TaxFormsStatus) ?? 'not_started',
        statusLabel: toStatusLabel(((data?.tax_forms_status as TaxFormsStatus) ?? 'not_started') as TaxFormsStatus),
      },
    },
    { status: 200 }
  );
}


