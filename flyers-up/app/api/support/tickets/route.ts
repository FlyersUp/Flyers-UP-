/**
 * POST /api/support/tickets
 * Create a support ticket. User must be authenticated.
 * Inserts to DB first; optional Resend notification (does not fail the request).
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  notifySupportInboxOfTicket,
  type SupportTicketNotifyOutcome,
} from '@/lib/email/support-ticket-notification';
import { isValidSupportCategory } from '@/lib/support/ticket-categories';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    category?: string;
    subject?: string | null;
    message?: string;
    includeDiagnostics?: boolean;
    clientPath?: string | null;
    /** Client will upload attachments after ticket id is returned */
    expects_attachments?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const categoryRaw = String(body.category ?? 'other').trim();
  const category = isValidSupportCategory(categoryRaw) ? categoryRaw : 'other';

  const subjectLine =
    body.subject != null && String(body.subject).trim() !== '' ? String(body.subject).trim().slice(0, 200) : null;

  const message = String(body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: 'Message is too long (max 8000 characters)' }, { status: 400 });
  }

  const includeDiagnostics = Boolean(body.includeDiagnostics ?? true);
  const expectsAttachments = Boolean(body.expects_attachments);
  const url = new URL(req.url);
  const diagnostics = includeDiagnostics
    ? {
        api_path: url.pathname,
        client_path: typeof body.clientPath === 'string' ? body.clientPath.slice(0, 500) : null,
        referer: req.headers.get('referer') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
      }
    : null;

  const { data: inserted, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: user.id,
      category,
      subject: subjectLine,
      message,
      include_diagnostics: includeDiagnostics,
      diagnostics: diagnostics as Record<string, unknown>,
      status: 'open',
    })
    .select('id, created_at')
    .single();

  if (error || !inserted?.id) {
    console.error('[support] ticket insert error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }

  const row = inserted as { id: string; created_at: string };
  const ticketId = row.id;
  const createdAtIso = row.created_at;

  const { data: profileRow } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const userRole = (profileRow as { role?: string } | null)?.role ?? null;

  try {
    const admin = createAdminSupabaseClient();
    await appendTrustSafetyAudit(admin, {
      resource_type: 'support_ticket',
      resource_id: ticketId,
      action: 'ticket_created',
      actor_user_id: user.id,
      details: { category },
    });
  } catch (e) {
    console.error('[support] audit log failed (ticket saved):', e);
  }

  let notifyOutcome: SupportTicketNotifyOutcome = {
    result: 'skipped_resend_not_configured',
    detail: 'notify step not run',
  };
  try {
    notifyOutcome = await notifySupportInboxOfTicket({
      ticketId,
      createdAtIso,
      userId: user.id,
      userEmail: user.email ?? null,
      userRole,
      category,
      subjectLine,
      message,
      diagnostics,
      expectsAttachments,
    });
  } catch (e) {
    console.error('[support] notification unexpected error (ticket saved):', e);
    notifyOutcome = {
      result: 'failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    const admin = createAdminSupabaseClient();
    const detail =
      notifyOutcome.detail != null ? String(notifyOutcome.detail).slice(0, 2000) : null;
    const { error: metaErr } = await admin
      .from('support_tickets')
      .update({
        inbox_email_notify_status: notifyOutcome.result,
        inbox_email_notify_at: new Date().toISOString(),
        inbox_email_notify_detail: detail,
      })
      .eq('id', ticketId);
    if (metaErr) {
      console.error('[support] inbox notify metadata update failed ticket=%s', ticketId, metaErr);
    }
  } catch (e) {
    console.error('[support] inbox notify metadata update exception ticket=%s', ticketId, e);
  }

  const notification = notifyOutcome.result;

  return NextResponse.json({
    success: true,
    ticketId,
    notification,
    message:
      notification === 'sent'
        ? 'Your ticket was saved. We sent an email to our support inbox (delivery still depends on your mail provider). We do not guarantee response times.'
        : notification === 'failed'
          ? 'Your ticket was saved. Email notification did not go through; our team can still review it in admin tools when available.'
          : 'Your ticket was saved. We do not guarantee email delivery or response times; our team reviews tickets through internal tools.',
  });
}
