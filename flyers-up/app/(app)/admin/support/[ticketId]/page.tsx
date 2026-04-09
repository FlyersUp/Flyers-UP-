import Layout from '@/components/Layout';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { AdminSupportTicketPanel } from '@/components/admin/AdminSupportTicketPanel';
import { SupportTicketAttachmentsPanel } from '@/components/admin/SupportTicketAttachmentsPanel';
import { TrustSafetyAuditTrail } from '@/components/admin/TrustSafetyAuditTrail';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const dynamic = 'force-dynamic';

export default async function AdminSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  await requireAdminUser('/admin/support');

  const { ticketId: rawId } = await params;
  const ticketId = normalizeUuidOrNull(rawId);
  if (!ticketId) notFound();

  const admin = createAdminSupabaseClient();
  const { data: t, error } = await admin
    .from('support_tickets')
    .select(
      'id, user_id, category, subject, message, include_diagnostics, diagnostics, status, internal_notes, created_at, updated_at, attachment_storage_paths, inbox_email_notify_status, inbox_email_notify_at, inbox_email_notify_detail'
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error || !t) {
    if (error) console.error('[admin/support/detail]', error);
    notFound();
  }

  const { data: prof } = await admin
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('id', t.user_id)
    .maybeSingle();

  const who = prof?.full_name || prof?.email || String(t.user_id);

  return (
    <Layout title="Flyers Up – Admin · Support ticket">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Support ticket</h1>
            <p className="mt-1 text-sm text-muted">
              {new Date(t.created_at).toLocaleString()}
              {t.updated_at ? ` · Updated ${new Date(t.updated_at).toLocaleString()}` : ''}
            </p>
          </div>
          <Link className="text-sm text-muted hover:text-text whitespace-nowrap" href="/admin/support">
            ← All tickets
          </Link>
        </div>

        <dl className="mt-6 grid gap-3 text-sm border border-border rounded-lg bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-28 shrink-0">Status</dt>
            <dd className="text-text capitalize">{String(t.status).replace('_', ' ')}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-28 shrink-0">Category</dt>
            <dd className="text-text">{t.category}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-28 shrink-0">User</dt>
            <dd className="text-text break-all">{who}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-28 shrink-0">Role</dt>
            <dd className="text-text capitalize">{prof?.role ?? '—'}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-28 shrink-0">User id</dt>
            <dd className="text-text font-mono text-xs break-all">{t.user_id}</dd>
          </div>
          {t.subject ? (
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted w-28 shrink-0">Subject</dt>
              <dd className="text-text">{t.subject}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3 col-span-full">
            <dt className="text-muted w-28 shrink-0">Inbox email</dt>
            <dd className="text-text space-y-1">
              <div>
                Status:{' '}
                <span className="font-mono text-xs">
                  {(t as { inbox_email_notify_status?: string }).inbox_email_notify_status ?? '—'}
                </span>
              </div>
              {(t as { inbox_email_notify_at?: string }).inbox_email_notify_at ? (
                <div className="text-xs text-muted">
                  Last notify step: {new Date((t as { inbox_email_notify_at: string }).inbox_email_notify_at).toLocaleString()}
                </div>
              ) : null}
              {(t as { inbox_email_notify_detail?: string }).inbox_email_notify_detail ? (
                <pre className="text-xs text-muted whitespace-pre-wrap font-mono bg-surface2 p-2 rounded-md max-h-24 overflow-y-auto">
                  {(t as { inbox_email_notify_detail: string }).inbox_email_notify_detail}
                </pre>
              ) : null}
            </dd>
          </div>
        </dl>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text mb-2">Message</h2>
          <pre className="whitespace-pre-wrap text-sm text-text p-4 rounded-lg border border-border bg-surface2 font-sans">
            {t.message}
          </pre>
        </section>

        {t.include_diagnostics && t.diagnostics != null ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-text mb-2">Diagnostics</h2>
            <pre className="text-xs text-muted overflow-x-auto p-4 rounded-lg border border-border bg-surface2 font-mono max-h-80 overflow-y-auto">
              {JSON.stringify(t.diagnostics, null, 2)}
            </pre>
          </section>
        ) : null}

        <SupportTicketAttachmentsPanel paths={(t as { attachment_storage_paths?: string[] }).attachment_storage_paths} />

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-text mb-2">Audit log</h2>
          <TrustSafetyAuditTrail resourceType="support_ticket" resourceId={t.id} />
        </section>

        <AdminSupportTicketPanel
          ticketId={t.id}
          initialStatus={t.status}
          initialInternalNotes={t.internal_notes}
        />
      </div>
    </Layout>
  );
}
