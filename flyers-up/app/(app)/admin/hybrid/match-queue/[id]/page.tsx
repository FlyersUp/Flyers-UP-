import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { loadRankedCandidatesForMatchRequest } from '@/lib/marketplace/loadMatchRequestCandidates';
import { MatchRequestDetailScreen } from '@/components/hybrid/MatchRequestDetailScreen';
import type { CandidatePro, OutreachLogEntry } from '@/lib/hybrid-ui/types';
import { MOCK_CANDIDATE_PROS, MOCK_OUTREACH_LOG } from '@/lib/hybrid-ui/mock-data';
import { responseSpeedTierFromScore } from '@/lib/marketplace/proMatchable';

export const dynamic = 'force-dynamic';

function outreachStatusLabel(status: string): string {
  switch (status) {
    case 'push_sent':
    case 'sms_sent':
    case 'not_contacted':
    case 'viewed':
      return 'Awaiting response';
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Declined';
    case 'no_response':
      return 'No response';
    default:
      return status;
  }
}

function mapOutreachRows(rows: Record<string, unknown>[]): OutreachLogEntry[] {
  return rows.map((e) => {
    const status = String(e.outreach_status ?? '');
    let tone: OutreachLogEntry['tone'] = 'info';
    if (status === 'accepted') tone = 'success';
    if (status === 'declined' || status === 'no_response') tone = 'warning';
    const ch = String(e.outreach_channel ?? 'manual');
    const notes = e.notes != null ? String(e.notes) : '';
    return {
      id: String(e.id),
      at: String(e.sent_at ?? e.created_at ?? new Date().toISOString()),
      message: `${ch} · ${outreachStatusLabel(status)}${notes ? ` — ${notes}` : ''}`,
      tone,
      statusKey: status,
    };
  });
}

export default async function AdminMatchRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminSupabaseClient();
  const { data: mr, error } = await admin.from('match_requests').select('*').eq('id', id).maybeSingle();

  if (error || !mr) {
    return (
      <MatchRequestDetailScreen
        matchRequestId={id}
        customerName="Julianne Abernathy"
        customerEmail="julianne@example.com"
        customerPhone="(917) 555-0142"
        occupationSlug="architectural-designer"
        boroughSlug="brooklyn"
        urgency="flexible"
        preferredTime="Oct 24, 2024 — morning"
        notes="Heritage restoration project: need a pro comfortable with DOB filings and brownstone detail work. Budget flexible for the right fit."
        status="pending_review"
        budgetLabel="$4,500 – $8,000"
        candidates={MOCK_CANDIDATE_PROS}
        outreach={MOCK_OUTREACH_LOG}
        outreachAttemptCount={0}
        outreachCap={3}
      />
    );
  }

  const row = mr as Record<string, unknown>;
  const customerId = String(row.customer_id);
  const { data: prof } = await admin.from('profiles').select('full_name, email, phone').eq('id', customerId).maybeSingle();

  const occupationSlug = String(row.occupation_slug);
  const boroughSlug = String(row.borough_slug);
  const urgency = (row.urgency as 'asap' | 'today' | 'flexible' | undefined) ?? 'flexible';
  const ranked = await loadRankedCandidatesForMatchRequest(admin, { occupationSlug, boroughSlug, urgency, limit: 20 });

  const { data: prosDetail } = await admin
    .from('service_pros')
    .select(
      'id, display_name, service_area_mode, service_area_values, is_verified, is_active_this_week, jobs_completed, last_matched_at, recent_response_score, manual_match_priority, rating, review_count'
    )
    .in(
      'id',
      ranked.map((c) => c.proId)
    );

  const proMap = new Map((prosDetail ?? []).map((p) => [String((p as { id: string }).id), p as Record<string, unknown>]));

  const { data: outreachRaw } = await admin
    .from('match_outreach_log')
    .select('id, pro_id, outreach_status, sent_at, responded_at, notes, outreach_channel, created_at')
    .eq('match_request_id', id)
    .order('sent_at', { ascending: false });

  const outreachList = (outreachRaw ?? []) as Record<string, unknown>[];
  const outreachUi = outreachList.length ? mapOutreachRows(outreachList) : MOCK_OUTREACH_LOG;

  const lastSentByPro = new Map<string, string>();
  for (const e of outreachList) {
    const pid = String(e.pro_id);
    const sent = String(e.sent_at ?? '');
    if (!lastSentByPro.has(pid)) lastSentByPro.set(pid, sent);
  }

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const jobsWeekMap = new Map<string, number>();
  if (ranked.length > 0) {
    const { data: jb } = await admin
      .from('bookings')
      .select('pro_id')
      .in(
        'pro_id',
        ranked.map((c) => c.proId)
      )
      .gte('created_at', since)
      .is('cancelled_at', null);
    for (const b of jb ?? []) {
      const pid = String((b as { pro_id: string }).pro_id);
      jobsWeekMap.set(pid, (jobsWeekMap.get(pid) ?? 0) + 1);
    }
  }

  const candidates: CandidatePro[] =
    ranked.length > 0
      ? ranked.map((r, idx) => {
          const p = proMap.get(r.proId);
          const vals = Array.isArray(p?.service_area_values) ? (p!.service_area_values as string[]).join(', ') : '';
          const rs = p?.recent_response_score;
          const rsNum = rs != null && String(rs).trim() !== '' ? Number(rs) : null;
          const sent = lastSentByPro.get(r.proId);
          let lastContactedMinutesAgo: number | null = null;
          if (sent) {
            lastContactedMinutesAgo = Math.max(0, Math.round((Date.now() - new Date(sent).getTime()) / 60000));
          }
          return {
            id: r.proId,
            rank: idx + 1,
            rankScore: Math.min(99, Math.max(55, Math.round(r.score))),
            name: String(p?.display_name ?? r.displayName),
            rating: Number(p?.rating ?? 0) || 4.8,
            jobsCompleted: Number(p?.jobs_completed ?? 0),
            jobsThisWeek: jobsWeekMap.get(r.proId) ?? 0,
            neighborhoods: vals || 'NYC',
            tags: [`#${idx + 1} ranked`, occupationSlug],
            responseLabel:
              rs != null && String(rs).trim() !== '' ? `Response signal: ${String(rs)}` : 'Responsiveness on file',
            responseSpeed: responseSpeedTierFromScore(rsNum),
            lastContactedMinutesAgo,
          };
        })
      : MOCK_CANDIDATE_PROS;

  const outreachCap = Math.max(1, Math.min(20, Number(row.outreach_cap ?? 3) || 3));
  const outreachAttemptCount = Math.max(0, Number(row.outreach_attempt_count ?? 0) || 0);

  return (
    <MatchRequestDetailScreen
      matchRequestId={id}
      customerName={String((prof as { full_name?: string | null } | null)?.full_name ?? 'Customer')}
      customerEmail={String((prof as { email?: string | null } | null)?.email ?? '—')}
      customerPhone={(prof as { phone?: string | null } | null)?.phone ?? null}
      occupationSlug={occupationSlug}
      boroughSlug={boroughSlug}
      urgency={String(row.urgency)}
      preferredTime={row.preferred_time != null ? String(row.preferred_time) : null}
      notes={row.notes != null ? String(row.notes) : null}
      status={String(row.status)}
      budgetLabel={null}
      candidates={candidates}
      outreach={outreachUi}
      outreachAttemptCount={outreachAttemptCount}
      outreachCap={outreachCap}
    />
  );
}
