/**
 * PATCH /api/support/tickets/[id]
 * Ticket owner: register attachment storage paths after uploading files to the support_attachments bucket.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PATHS = 3;
const MAX_PATH_LEN = 512;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidAttachmentPath(path: string, userId: string, ticketId: string): boolean {
  if (path.length > MAX_PATH_LEN || path.includes('..') || path.startsWith('/')) return false;
  const re = new RegExp(`^${escapeRegex(userId)}/${escapeRegex(ticketId)}/[a-zA-Z0-9._-]+$`);
  return re.test(path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = normalizeUuidOrNull(id);
  if (!ticketId) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { attachment_storage_paths?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawPaths = Array.isArray(body.attachment_storage_paths) ? body.attachment_storage_paths : null;
  if (!rawPaths) {
    return NextResponse.json({ error: 'attachment_storage_paths array required' }, { status: 400 });
  }
  if (rawPaths.length > MAX_PATHS) {
    return NextResponse.json({ error: `At most ${MAX_PATHS} attachments` }, { status: 400 });
  }

  for (const p of rawPaths) {
    if (typeof p !== 'string' || !isValidAttachmentPath(p, user.id, ticketId)) {
      return NextResponse.json({ error: 'Invalid attachment path' }, { status: 400 });
    }
  }

  const admin = createAdminSupabaseClient();
  const { data: ticket, error: fetchErr } = await admin
    .from('support_tickets')
    .select('id, user_id, attachment_storage_paths')
    .eq('id', ticketId)
    .maybeSingle();

  if (fetchErr || !ticket) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (String(ticket.user_id) !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = (ticket.attachment_storage_paths as string[] | null) ?? [];
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Attachments already registered for this ticket' }, { status: 409 });
  }

  const { data: row, error: upErr } = await admin
    .from('support_tickets')
    .update({
      attachment_storage_paths: rawPaths,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .select('id, attachment_storage_paths')
    .maybeSingle();

  if (upErr || !row) {
    console.error('[support/tickets PATCH] update failed', upErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  await appendTrustSafetyAudit(admin, {
    resource_type: 'support_ticket',
    resource_id: ticketId,
    action: 'attachments_registered',
    actor_user_id: user.id,
    details: { count: rawPaths.length },
  });

  return NextResponse.json({ ok: true, ticket: row });
}
