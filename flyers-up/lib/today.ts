import { getProJobs } from '@/lib/api';
import { mockJobs, mockConversations } from '@/lib/mockData';

export type TodayJobStatus = 'upcoming' | 'in_progress' | 'completed' | 'delayed';
export type TodayRiskLevel = 'low' | 'medium' | 'high';

export type TodayJob = {
  id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  client_name: string;
  client_phone?: string | null;
  address: string;
  service_type: string;
  status: TodayJobStatus;
  eta_minutes?: number | null;
  risk: TodayRiskLevel;
  bookingId?: string;
};

export type TodayAlert = {
  id: string;
  type: 'late_risk' | 'pending_message' | 'missing_task' | 'general';
  title: string;
  ctaLabel?: string;
};

export type TodayTask = {
  id: string;
  title: string;
  helper?: string;
  done: boolean;
};

export type TodayMessageThread = {
  thread_id: string;
  client_name: string;
  snippet: string;
  updated_at: string; // ISO
};

export type TodayEarnings = {
  expected: number | null;
  completed: number | null;
  pending_release: number | null;
  tips: number | null;
};

export type TodayOverview = {
  dateISO: string; // YYYY-MM-DD (local)
  jobs: TodayJob[];
  alerts: TodayAlert[];
  tasks: TodayTask[];
  earnings: TodayEarnings;
  messages: TodayMessageThread[];
};

function formatLocalISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeToLocalDate(dateISO: string, time: string) {
  // Expects `time` like "10:00 AM"
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  const [, hh, mm, ap] = m;
  let hours = Number(hh);
  const minutes = Number(mm);
  const ampm = ap.toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  const d = new Date(dateISO + 'T00:00:00');
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function deriveRisk(jobStart: Date, etaMinutes: number | null | undefined): TodayRiskLevel {
  if (etaMinutes == null) return 'low';
  // Simple heuristic: if ETA pushes arrival close to (or past) start time, raise risk.
  const now = new Date();
  const etaAt = new Date(now.getTime() + etaMinutes * 60000);
  const diff = jobStart.getTime() - etaAt.getTime();
  if (diff < -5 * 60000) return 'high';
  if (diff < 10 * 60000) return 'medium';
  return 'low';
}

function inferStatusesForToday(jobs: TodayJob[]): TodayJob[] {
  const now = new Date();
  // If nothing is marked in_progress, promote the nearest started-but-not-completed job.
  const hasInProgress = jobs.some((j) => j.status === 'in_progress');
  if (hasInProgress) return jobs;

  const sorted = [...jobs].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const candidate = sorted.find((j) => {
    if (j.status === 'completed') return false;
    const start = new Date(j.start_time).getTime();
    return start <= now.getTime();
  });

  if (!candidate) return jobs;
  return jobs.map((j) => (j.id === candidate.id ? { ...j, status: 'in_progress' as TodayJobStatus } : j));
}

function buildDefaultTasks(): TodayTask[] {
  return [
    { id: 'photos', title: 'Upload before/after photos', helper: 'Attach to today’s completed jobs.', done: false },
    { id: 'offer', title: 'Accept pending offer', helper: 'If you received a new request today.', done: false },
    { id: 'arrival', title: 'Confirm arrival', helper: 'Send a quick update when you arrive.', done: false },
    { id: 'docs', title: 'Submit documentation', helper: 'Only if required for this job type.', done: false },
  ];
}

function buildMessagesFallback(proUserId: string): TodayMessageThread[] {
  // TODO: Filter threads to bookings scheduled today when schema supports it.
  const threads = mockConversations
    .filter((c) => c.proId === proUserId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return threads.map((t) => ({
    thread_id: t.id,
    client_name: t.customerName,
    snippet: t.lastMessage || '—',
    updated_at: t.updatedAt,
  }));
}

function buildMockJobsForToday(dateISO: string): TodayJob[] {
  const base = (mockJobs || []).filter((j) => j.date === '2024-01-15'); // existing mock day
  const asToday = base.map((j) => ({ ...j, date: dateISO }));

  return asToday
    .map((j) => {
      const start = parseTimeToLocalDate(dateISO, j.time) ?? new Date(dateISO + 'T09:00:00');
      const end = new Date(start.getTime() + 60 * 60000); // TODO: derive from service duration
      const eta = null; // TODO: derive from location / nav integration if added

      // mockJobs currently uses a limited status union ('scheduled' | 'in_progress').
      // Keep this resilient if the mock expands later.
      const rawStatus = (j as unknown as { status: string }).status;
      const status: TodayJobStatus =
        rawStatus === 'completed' ? 'completed' : rawStatus === 'in_progress' ? 'in_progress' : 'upcoming';

      return {
        id: j.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        client_name: j.customerName,
        client_phone: null,
        address: j.address,
        service_type: j.service,
        status,
        eta_minutes: eta,
        risk: deriveRisk(start, eta),
        bookingId: j.id,
      } satisfies TodayJob;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export async function getTodayOverview(proUserId: string): Promise<TodayOverview> {
  const today = new Date();
  const dateISO = formatLocalISODate(today);

  // Prefer real jobs if Supabase is configured.
  const SUPABASE_CONFIGURED = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let jobs: TodayJob[] = [];
  if (SUPABASE_CONFIGURED) {
    const all = await getProJobs(proUserId);
    const todays = (all || []).filter((b) => b.date === dateISO);

    jobs = todays
      .map((b) => {
        const start = parseTimeToLocalDate(b.date, b.time);
        const startAt = start ?? new Date(b.date + 'T09:00:00'); // TODO: ensure service_time stored consistently
        const endAt = new Date(startAt.getTime() + 60 * 60000); // TODO: add duration when available

        // Map DB booking status into timeline statuses.
        // NOTE: The DB currently doesn't track "in_progress"; we infer it for "today" UX.
        let status: TodayJobStatus = 'upcoming';
        if (b.status === 'completed') status = 'completed';
        if (b.status === 'cancelled' || b.status === 'declined') status = 'completed';

        const eta = null; // TODO: wire from nav/telemetry if introduced
        return {
          id: b.id,
          start_time: startAt.toISOString(),
          end_time: endAt.toISOString(),
          client_name: b.customerName || 'Customer',
          client_phone: null, // TODO: add phone to booking join when schema includes it
          address: b.address,
          service_type: b.category || 'Service',
          status,
          eta_minutes: eta,
          risk: deriveRisk(startAt, eta),
          bookingId: b.id,
        } satisfies TodayJob;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  if (!jobs.length) {
    // If there are no real jobs (or Supabase isn't configured), provide safe mock data.
    // TODO: Remove mock fallback once bookings are reliably populated for pros.
    jobs = buildMockJobsForToday(dateISO);
  }

  jobs = inferStatusesForToday(jobs);

  const expected = jobs.reduce((sum, j) => sum + 0, 0);
  // TODO: derive from booking.price or earnings table when present
  const earnings: TodayEarnings = {
    expected: expected === 0 ? null : expected,
    completed: null,
    pending_release: null,
    tips: null,
  };

  // Basic, calm alerts derived from simple heuristics.
  const alerts: TodayAlert[] = [];
  const nextUpcoming = jobs.find((j) => j.status === 'upcoming');
  if (nextUpcoming) {
    const start = new Date(nextUpcoming.start_time);
    const mins = Math.round((start.getTime() - Date.now()) / 60000);
    if (mins >= 0 && mins <= 45) {
      alerts.push({ id: 'next-job', type: 'general', title: 'Next job starts soon', ctaLabel: 'Review' });
    }
  }

  const tasks = buildDefaultTasks();
  const messages = buildMessagesFallback(proUserId);

  return { dateISO, jobs, alerts, tasks, earnings, messages };
}

