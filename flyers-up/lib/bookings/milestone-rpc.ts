/** Parse JSON returned by booking_milestone_*_atomic RPCs. */

export type MilestoneAtomicRpcParsed = {
  ok: boolean;
  error?: string;
  idempotent?: boolean;
  milestoneId?: string;
  confirmationDueAt?: string;
};

export function parseMilestoneAtomicRpc(data: unknown): MilestoneAtomicRpcParsed {
  if (data == null || typeof data !== 'object') {
    return { ok: false, error: 'invalid_response' };
  }
  const d = data as Record<string, unknown>;
  if (d.ok === true) {
    return {
      ok: true,
      idempotent: d.idempotent === true,
      milestoneId: typeof d.milestone_id === 'string' ? d.milestone_id : undefined,
      confirmationDueAt: typeof d.confirmation_due_at === 'string' ? d.confirmation_due_at : undefined,
    };
  }
  return {
    ok: false,
    error: typeof d.error === 'string' ? d.error : 'rpc_failed',
  };
}

/** Map RPC error codes to HTTP status (default 409). */
export function milestoneRpcHttpStatus(error: string | undefined): number {
  if (error === 'forbidden') return 403;
  if (error === 'booking_not_found' || error === 'milestone_not_found') return 404;
  return 409;
}
