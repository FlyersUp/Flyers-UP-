import type { AdminMoneyControlState } from '@/lib/bookings/admin-money-control-state';
import { AdminMoneyControlActions } from '@/components/admin/AdminMoneyControlActions';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-hairline py-2 last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right break-words max-w-[min(100%,20rem)]">{value}</span>
    </div>
  );
}

export function AdminBookingMoneyControlPanel({
  bookingId,
  state,
}: {
  bookingId: string;
  state: AdminMoneyControlState;
}) {
  const stuck = state.stuckPayout;
  const latest = state.latestMoneyEvent;

  return (
    <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">Money control</h2>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Unified deposit, final, payout, refund, and remediation snapshot for operations.
          </p>
        </div>
      </div>

      {stuck ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <p className="font-semibold">Possible stuck payout</p>
          <p className="mt-1 leading-relaxed">{stuck.reason}</p>
        </div>
      ) : null}

      {state.attention.primary !== 'no_attention_needed' &&
      state.attention.primary !== 'stuck_silent_miss' ? (
        <div className="rounded-lg border border-sky-300/50 dark:border-sky-800/50 bg-sky-50/90 dark:bg-sky-950/25 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
          <p className="font-semibold">{state.attention.headline}</p>
          <p className="mt-1 leading-relaxed">{state.attention.detail}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-sky-900/90 dark:text-sky-200/90">
            <span className="font-medium">Next:</span> {state.attention.recommendedNextAction}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-hairline bg-surface2/50 px-3 py-2 space-y-0">
        <Row label="Deposit" value={state.deposit} />
        <Row label="Final payment" value={state.final} />
        <Row label="Payout" value={state.payout} />
        <Row label="Refund pipeline" value={state.refundPipeline} />
        <Row label="Remediation" value={state.remediation} />
        <Row label="Clawback" value={state.clawback} />
        <Row label="Stripe outbound recovery" value={state.stripeOutboundRecovery} />
      </div>

      <div className="rounded-lg border border-hairline bg-surface2/30 px-3 py-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Latest money event</p>
        {latest ? (
          <p className="mt-1 text-sm">
            <span className="font-mono text-xs">{latest.createdAt}</span>
            <span className="mx-2 text-muted">·</span>
            <span className="font-medium">{latest.type}</span>
            <span className="text-muted text-xs">
              {' '}
              ({latest.phase}/{latest.status})
            </span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">No rows in booking_payment_events yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-sky-200/50 dark:border-sky-800/40 bg-sky-50/50 dark:bg-sky-950/20 px-3 py-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Recommended next action</p>
        <p className="mt-1 text-sm leading-relaxed">{state.recommendedNextAction}</p>
      </div>

      <AdminMoneyControlActions bookingId={bookingId} state={state} />
    </section>
  );
}
