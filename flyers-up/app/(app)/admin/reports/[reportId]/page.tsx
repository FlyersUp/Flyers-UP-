import Layout from '@/components/Layout';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { AdminUserReportPanel } from '@/components/admin/AdminUserReportPanel';
import { TrustSafetyAuditTrail } from '@/components/admin/TrustSafetyAuditTrail';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const dynamic = 'force-dynamic';

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  await requireAdminUser('/admin/reports');

  const { reportId: rawId } = await params;
  const reportId = normalizeUuidOrNull(rawId);
  if (!reportId) notFound();

  const admin = createAdminSupabaseClient();
  const { data: r, error } = await admin
    .from('user_reports')
    .select(
      'id, reporter_id, reported_user_id, reason, context, booking_id, status, admin_notes, reviewed_at, created_at, updated_at'
    )
    .eq('id', reportId)
    .maybeSingle();

  if (error || !r) {
    if (error) console.error('[admin/reports/detail]', error);
    notFound();
  }

  const ids = [r.reporter_id, r.reported_user_id];
  const { data: profs } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .in('id', ids);

  const profById = new Map(
    (profs ?? []).map((p: { id: string; email: string | null; full_name: string | null; role: string | null }) => [
      String(p.id),
      p,
    ])
  );

  const fmtUser = (userId: string) => {
    const p = profById.get(String(userId));
    const label = p?.full_name || p?.email || userId;
    return { label, role: p?.role, id: userId };
  };

  const reporter = fmtUser(r.reporter_id);
  const reported = fmtUser(r.reported_user_id);

  return (
    <Layout title="Flyers Up – Admin · User report">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">User report</h1>
            <p className="mt-1 text-sm text-muted">
              {new Date(r.created_at).toLocaleString()}
              {r.updated_at ? ` · Updated ${new Date(r.updated_at).toLocaleString()}` : ''}
            </p>
          </div>
          <Link className="text-sm text-muted hover:text-text whitespace-nowrap" href="/admin/reports">
            ← All reports
          </Link>
        </div>

        <dl className="mt-6 grid gap-3 text-sm border border-border rounded-lg bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-36 shrink-0">Status</dt>
            <dd className="text-text capitalize">{r.status}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-36 shrink-0">Reason</dt>
            <dd className="text-text capitalize">{r.reason.replace(/_/g, ' ')}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-36 shrink-0">Reporter</dt>
            <dd className="text-text">
              {reporter.label}
              {reporter.role ? (
                <span className="text-muted"> · {reporter.role}</span>
              ) : null}
              <div className="font-mono text-xs text-muted break-all mt-0.5">{reporter.id}</div>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-36 shrink-0">Reported user</dt>
            <dd className="text-text">
              {reported.label}
              {reported.role ? (
                <span className="text-muted"> · {reported.role}</span>
              ) : null}
              <div className="font-mono text-xs text-muted break-all mt-0.5">{reported.id}</div>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted w-36 shrink-0">Linked booking</dt>
            <dd className="text-text">
              {r.booking_id ? (
                <Link href={`/admin/bookings?q=${r.booking_id}`} className="text-accent hover:underline font-mono text-xs break-all">
                  {r.booking_id}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          {r.reviewed_at ? (
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted w-36 shrink-0">Reviewed at</dt>
              <dd className="text-text">{new Date(r.reviewed_at).toLocaleString()}</dd>
            </div>
          ) : null}
        </dl>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text mb-2">Context</h2>
          <pre className="whitespace-pre-wrap text-sm text-text p-4 rounded-lg border border-border bg-surface2 font-sans min-h-[4rem]">
            {r.context?.trim() ? r.context : '—'}
          </pre>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-text mb-2">Audit log</h2>
          <TrustSafetyAuditTrail resourceType="user_report" resourceId={r.id} />
        </section>

        <AdminUserReportPanel
          reportId={r.id}
          initialStatus={r.status}
          initialAdminNotes={r.admin_notes}
        />
      </div>
    </Layout>
  );
}
