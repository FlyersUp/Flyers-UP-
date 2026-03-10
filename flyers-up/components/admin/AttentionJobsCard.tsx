/**
 * Jobs Needing Attention card for admin dashboard.
 * Shows jobs waiting too long or needing intervention.
 * TODO: Wire to backend query for requested jobs with long wait times.
 */

export interface AttentionJob {
  id: string;
  category: string;
  areaZip: string;
  waitingMinutes: number;
  status: string;
  href?: string;
}

interface AttentionJobsCardProps {
  /** Jobs needing attention. If empty, shows "No jobs need attention right now." */
  jobs: AttentionJob[];
}

export function AttentionJobsCard({ jobs }: AttentionJobsCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Jobs Waiting</h3>
      <div className="mt-3 space-y-3">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted">No jobs need attention right now.</p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/5 bg-surface2/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{job.category}</p>
                <p className="text-xs text-muted">
                  {job.areaZip} · {job.waitingMinutes} min waiting · {job.status}
                </p>
              </div>
              {job.href ? (
                <a
                  href={job.href}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accentContrast hover:opacity-95"
                >
                  View
                </a>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
