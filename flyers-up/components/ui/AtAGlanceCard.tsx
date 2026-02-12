import Link from 'next/link';

type JobLike = {
  date: string;
  time: string;
  total: number;
};

function parseTimeToDate(dateISO: string, time: string) {
  const t = time.trim();
  // Accept either "10:00 AM" or 24h "14:00" (from <input type="time">).
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const m24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m12 && !m24) return null;

  let hours = 0;
  let minutes = 0;
  if (m12) {
    const [, hh, mm, ap] = m12;
    hours = Number(hh);
    minutes = Number(mm);
    const ampm = ap.toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  } else if (m24) {
    const [, hh, mm] = m24;
    hours = Number(hh);
    minutes = Number(mm);
  }
  const d = new Date(dateISO + 'T00:00:00');
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function getNextJobCountdown(jobs: JobLike[]) {
  const now = new Date();
  const upcoming = jobs
    .map((j) => ({ job: j, at: parseTimeToDate(j.date, j.time) }))
    .filter((x): x is { job: JobLike; at: Date } => Boolean(x.at))
    .filter((x) => x.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const next = upcoming[0];
  if (!next) return '—';
  const diffMs = next.at.getTime() - now.getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function sumTodayEarnings(jobs: JobLike[]) {
  if (!jobs?.length) return null;
  return jobs.reduce((acc, j) => acc + (Number.isFinite(j.total) ? j.total : 0), 0);
}

function MiniItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[9.5rem]">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-base font-semibold text-text">{value}</div>
    </div>
  );
}

export function AtAGlanceCard({
  jobs,
  rating,
  actionNeededCount,
}: {
  jobs: JobLike[];
  rating: number | null;
  actionNeededCount: number | null;
}) {
  const nextJobIn = getNextJobCountdown(jobs);
  const expectedPayout = sumTodayEarnings(jobs);
  const ratingHealth = rating != null && rating < 4.7 ? 'Watch' : 'Stable';
  const actionNeeded = actionNeededCount == null ? '—' : actionNeededCount === 0 ? 'None' : String(actionNeededCount);

  return (
    <div className="surface-card border-l-[3px] border-l-accent">
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-semibold text-text">Today at a Glance</div>
          <Link href="/pro/today" className="text-sm text-muted hover:text-text transition-colors">
            View more
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <MiniItem label="Next job in" value={nextJobIn} />
          <MiniItem
            label="Expected payout today"
            value={expectedPayout == null ? '—' : expectedPayout.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          />
          <MiniItem label="Rating health" value={ratingHealth} />
          <MiniItem label="Action needed" value={actionNeeded} />
        </div>
      </div>
    </div>
  );
}

