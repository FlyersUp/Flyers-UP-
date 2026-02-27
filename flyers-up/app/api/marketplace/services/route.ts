import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getActiveServices } from '@/lib/db/services';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/services
 * Returns active main services.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const services = await getActiveServices(supabase);
  return NextResponse.json({ ok: true, services });
}
