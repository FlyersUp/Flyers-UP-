/**
 * POST /api/support/tickets
 * Create a support ticket. User must be authenticated.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subject?: string; message?: string; includeDiagnostics?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const subject = String(body.subject ?? 'other').trim() || 'other';
  const message = String(body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const includeDiagnostics = Boolean(body.includeDiagnostics ?? true);
  const url = new URL(req.url);
  const diagnostics = includeDiagnostics
    ? {
        pathname: url.pathname,
        user_agent: req.headers.get('user-agent') ?? null,
      }
    : null;

  const { error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    subject,
    message,
    include_diagnostics: includeDiagnostics,
    diagnostics: diagnostics as Record<string, unknown>,
    status: 'open',
  });

  if (error) {
    console.error('[support] ticket insert error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
