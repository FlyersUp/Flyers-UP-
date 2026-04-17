/**
 * Version B: moving to `awaiting_remaining_payment` only requires that a `job_completions` row
 * exists (created by POST .../complete). After photos are optional for marketplace payout gates.
 */
export function hasJobCompletionRowForAwaitingRemaining(jobCompletion: unknown): boolean {
  return jobCompletion != null;
}
