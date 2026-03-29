/**
 * Multi-day milestone + final confirmation rules (pure helpers).
 * Payout still uses booking-level Stripe transfer; these gates prevent release until milestones + final verification pass.
 */

export const MILESTONE_STATUSES = [
  'pending',
  'in_progress',
  'completed_pending_confirmation',
  'confirmed',
  'auto_confirmed',
  'disputed',
  'cancelled',
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export type MilestoneRowLike = {
  milestone_index: number;
  status: string;
  dispute_open: boolean;
  confirmation_due_at?: string | null;
  confirmed_at?: string | null;
  confirmation_source?: string | null;
};

export function computeConfirmationDueIso(nowMs: number, windowHours: number): string {
  const h = Math.max(1, Math.min(168, Math.floor(windowHours) || 24));
  return new Date(nowMs + h * 60 * 60 * 1000).toISOString();
}

/** Milestone settled: customer or auto-confirmed in DB (not merely timer elapsed). */
export function isMilestoneConfirmationSatisfied(m: MilestoneRowLike): boolean {
  if (m.dispute_open || m.status === 'disputed') return false;
  return m.status === 'confirmed' || m.status === 'auto_confirmed';
}

/** True when cron is allowed to auto-confirm this milestone row (due passed, still pending). */
export function isMilestoneAutoConfirmDue(m: MilestoneRowLike, nowIso: string): boolean {
  if (m.dispute_open || m.status !== 'completed_pending_confirmation') return false;
  return m.confirmation_due_at != null && m.confirmation_due_at < nowIso;
}

/** Final step: explicit confirmation timestamp set (customer or cron), not time-alone elsewhere. */
export function isFinalConfirmationSatisfied(input: {
  final_confirmed_at: string | null;
  dispute_open: boolean;
}): boolean {
  if (input.dispute_open) return false;
  return input.final_confirmed_at != null;
}

export function multiDayScheduleAllowsPayout(milestones: MilestoneRowLike[], isMultiDay: boolean): boolean {
  if (!isMultiDay) return true;
  if (milestones.length === 0) return false;
  for (const m of milestones) {
    if (m.dispute_open || m.status === 'disputed') return false;
    if (m.status === 'cancelled') return false;
    if (m.status !== 'confirmed' && m.status !== 'auto_confirmed') return false;
  }
  return true;
}

export function allMilestonesReadyForProFinalCompletion(milestones: MilestoneRowLike[]): boolean {
  if (milestones.length === 0) return true;
  return milestones.every((m) => m.status === 'confirmed' || m.status === 'auto_confirmed');
}

export function canProStartMilestone(sortedMilestones: MilestoneRowLike[], index: number): boolean {
  if (index < 0) return false;
  const has = sortedMilestones.some((m) => m.milestone_index === index);
  if (!has) return false;
  if (index === 0) return true;
  const prev = sortedMilestones.find((m) => m.milestone_index === index - 1);
  if (!prev) return false;
  return prev.status === 'confirmed' || prev.status === 'auto_confirmed';
}

export function parseProofPhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).slice(0, 20);
}

export type BookingProgressSummaryMilestone = {
  index: number;
  title: string;
  description: string | null;
  amountCents: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  confirmationDueAt: string | null;
  confirmedAt: string | null;
  confirmationSource: string | null;
  proofPhotos: string[];
  proofNotes: string | null;
  disputeOpen: boolean;
};

export type BookingProgressSummary = {
  isMultiDay: boolean;
  progressStatus: string | null;
  autoConfirmWindowHours: number;
  currentMilestoneIndex: number | null;
  milestones: BookingProgressSummaryMilestone[];
  final: {
    requestedAt: string | null;
    autoConfirmAt: string | null;
    confirmedAt: string | null;
    confirmationSource: string | null;
  };
  bookingDisputeOpen: boolean;
};

export function buildBookingProgressSummary(input: {
  isMultiDay: boolean;
  progressStatus: string | null;
  autoConfirmWindowHours: number;
  currentMilestoneIndex: number | null;
  milestones: Array<{
    milestone_index: number;
    title: string;
    description: string | null;
    amount_cents?: number | null;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    confirmation_due_at: string | null;
    confirmed_at: string | null;
    confirmation_source: string | null;
    proof_photos: unknown;
    proof_notes: string | null;
    dispute_open: boolean;
  }>;
  finalCompletionRequestedAt: string | null;
  finalAutoConfirmAt: string | null;
  finalConfirmedAt: string | null;
  finalConfirmationSource: string | null;
  disputeOpen: boolean;
}): BookingProgressSummary {
  const sorted = [...input.milestones].sort((a, b) => a.milestone_index - b.milestone_index);
  return {
    isMultiDay: input.isMultiDay,
    progressStatus: input.progressStatus,
    autoConfirmWindowHours: input.autoConfirmWindowHours,
    currentMilestoneIndex: input.currentMilestoneIndex,
    milestones: sorted.map((m) => ({
      index: m.milestone_index,
      title: m.title,
      description: m.description,
      amountCents: Math.max(0, Number(m.amount_cents ?? 0)) || 0,
      status: m.status,
      startedAt: m.started_at,
      completedAt: m.completed_at,
      confirmationDueAt: m.confirmation_due_at,
      confirmedAt: m.confirmed_at,
      confirmationSource: m.confirmation_source,
      proofPhotos: parseProofPhotos(m.proof_photos),
      proofNotes: m.proof_notes,
      disputeOpen: m.dispute_open,
    })),
    final: {
      requestedAt: input.finalCompletionRequestedAt,
      autoConfirmAt: input.finalAutoConfirmAt,
      confirmedAt: input.finalConfirmedAt,
      confirmationSource: input.finalConfirmationSource,
    },
    bookingDisputeOpen: input.disputeOpen,
  };
}
