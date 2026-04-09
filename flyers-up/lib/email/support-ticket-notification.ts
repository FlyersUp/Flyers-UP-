/**
 * Resend notification to the Flyers Up support inbox after a ticket is saved.
 * Never throws. DB insert must succeed regardless of this outcome.
 */
import { Resend } from 'resend';
import { getSupportInboxEmail } from '@/lib/support/official-contact';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev';

export type SupportTicketNotifyResult =
  | 'sent'
  | 'skipped_resend_not_configured'
  | 'skipped_notifications_disabled'
  | 'failed';

export type SupportTicketNotifyOutcome = {
  result: SupportTicketNotifyResult;
  /** Skip reason, provider error summary, or exception message */
  detail: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifySupportInboxOfTicket(params: {
  ticketId: string;
  createdAtIso: string;
  userId: string;
  userEmail: string | null;
  userRole: string | null;
  category: string;
  subjectLine: string | null;
  message: string;
  diagnostics: Record<string, unknown> | null;
  /** Client indicated files may be uploaded immediately after ticket creation */
  expectsAttachments: boolean;
}): Promise<SupportTicketNotifyOutcome> {
  const disabledRaw = process.env.SUPPORT_TICKET_EMAIL_NOTIFICATIONS?.trim();
  if (disabledRaw === '0') {
    console.info(
      '[support-ticket-email] SKIPPED notifications_disabled ticket=%s (SUPPORT_TICKET_EMAIL_NOTIFICATIONS=0)',
      params.ticketId
    );
    return {
      result: 'skipped_notifications_disabled',
      detail: 'SUPPORT_TICKET_EMAIL_NOTIFICATIONS=0',
    };
  }

  if (!resend) {
    console.info(
      '[support-ticket-email] SKIPPED resend_not_configured ticket=%s (RESEND_API_KEY missing)',
      params.ticketId
    );
    return {
      result: 'skipped_resend_not_configured',
      detail: 'RESEND_API_KEY not set',
    };
  }

  const to = getSupportInboxEmail();
  const subject = `[Flyers Up] Support ticket ${params.category}${params.subjectLine ? ` — ${params.subjectLine}` : ''}`;

  const attachmentsNote = params.expectsAttachments
    ? 'Client selected files to attach; paths are registered in a follow-up step after this email may send. Check attachment_storage_paths on the ticket.'
    : 'No files indicated at ticket creation (attachments may still be added later).';

  const textLines = [
    'New Flyers Up support ticket',
    '────────────────────────────',
    `Ticket ID:     ${params.ticketId}`,
    `Created (UTC): ${params.createdAtIso}`,
    `User ID:       ${params.userId}`,
    `User email:    ${params.userEmail ?? '(unknown)'}`,
    `User role:     ${params.userRole ?? '(unknown)'}`,
    `Category:      ${params.category}`,
    `Subject:       ${params.subjectLine ?? '(none)'}`,
    '',
    'Attachments:',
    attachmentsNote,
    '',
    'Message:',
    '────────────────────────────',
    params.message,
    '',
  ];

  if (params.diagnostics) {
    textLines.push('Diagnostics (JSON):', JSON.stringify(params.diagnostics, null, 2));
  }

  textLines.push('', `Support inbox recipient: ${to}`);

  const textBody = textLines.join('\n');

  const diagBlock = params.diagnostics
    ? `<pre style="font-size:12px;background:#f4f4f5;padding:12px;border-radius:8px;overflow:auto">${escapeHtml(
        JSON.stringify(params.diagnostics, null, 2)
      )}</pre>`
    : '<p style="color:#666">(none)</p>';

  const htmlBody = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:640px">
  <h2 style="margin:0 0 12px">New support ticket</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:140px">Ticket ID</td><td style="padding:6px 0"><code>${escapeHtml(params.ticketId)}</code></td></tr>
    <tr><td style="padding:6px 0;color:#666">Created (UTC)</td><td style="padding:6px 0">${escapeHtml(params.createdAtIso)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">User ID</td><td style="padding:6px 0"><code>${escapeHtml(params.userId)}</code></td></tr>
    <tr><td style="padding:6px 0;color:#666">User email</td><td style="padding:6px 0">${escapeHtml(params.userEmail ?? '(unknown)')}</td></tr>
    <tr><td style="padding:6px 0;color:#666">User role</td><td style="padding:6px 0">${escapeHtml(params.userRole ?? '(unknown)')}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Category</td><td style="padding:6px 0">${escapeHtml(params.category)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Subject</td><td style="padding:6px 0">${escapeHtml(params.subjectLine ?? '(none)')}</td></tr>
    <tr><td style="padding:6px 0;color:#666;vertical-align:top">Attachments</td><td style="padding:6px 0">${escapeHtml(attachmentsNote)}</td></tr>
  </table>
  <h3 style="margin:20px 0 8px;font-size:15px">Message</h3>
  <div style="white-space:pre-wrap;background:#f9fafb;padding:14px;border-radius:8px;border:1px solid #e5e7eb;font-size:14px">${escapeHtml(
    params.message
  )}</div>
  <h3 style="margin:20px 0 8px;font-size:15px">Diagnostics</h3>
  ${diagBlock}
  <p style="margin-top:24px;font-size:12px;color:#666">Delivered to <strong>${escapeHtml(to)}</strong></p>
</body></html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      text: textBody,
      html: htmlBody,
    });
    if (error) {
      const detail = [error.name, error.message].filter(Boolean).join(': ') || 'Resend error';
      console.error(
        '[support-ticket-email] FAILURE ticket=%s to=%s resend_error=%s',
        params.ticketId,
        to,
        detail
      );
      return { result: 'failed', detail };
    }
    console.info(
      '[support-ticket-email] SUCCESS ticket=%s to=%s resend_id=%s',
      params.ticketId,
      to,
      data?.id ?? '(no id)'
    );
    return { result: 'sent', detail: null };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[support-ticket-email] FAILURE ticket=%s to=%s exception=%s', params.ticketId, to, detail);
    return { result: 'failed', detail };
  }
}
