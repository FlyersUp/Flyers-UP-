export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

function getClientIp(req: NextRequest): string | null {
  // Prefer proxy header (Vercel/most CDNs). Take first IP if multiple.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  return null;
}

export async function POST(req: NextRequest) {
  // Auth can arrive via cookies (SSR) OR bearer token (client-side Supabase auth uses local storage).
  const authHeader = req.headers.get('authorization');
  const bearer =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : null;

  let user: { id: string } | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authed = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data } = await authed.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
    // Use the authed client for insert to satisfy RLS via JWT.
    supabase = authed as any;
  } else {
    supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
  }

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  let payload: { termsVersion?: string } | null = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const termsVersion = payload?.termsVersion?.trim();
  if (!termsVersion) {
    return NextResponse.json({ ok: false, error: 'Missing termsVersion' }, { status: 400 });
  }

  const ip = getClientIp(req);

  // Insert once per version; ignore duplicates.
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Auth client not available' }, { status: 500 });
  }
  const { error } = await supabase.from('legal_acceptances').insert({
    user_id: user.id,
    terms_version: termsVersion,
    ip_address: ip,
  });

  // Unique violation => already recorded.
  if (error && (error as any).code !== '23505') {
    return NextResponse.json({ ok: false, error: (error as any).message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

