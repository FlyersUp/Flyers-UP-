-- Payout review queue: expand status for admin workflow (pending_review, held, refunded, escalated).

ALTER TABLE public.payout_review_queue DROP CONSTRAINT IF EXISTS payout_review_queue_status_check;

UPDATE public.payout_review_queue SET status = 'pending_review' WHERE status = 'pending';

ALTER TABLE public.payout_review_queue
  ADD CONSTRAINT payout_review_queue_status_check CHECK (status IN (
    'pending_review',
    'held',
    'approved',
    'refunded',
    'rejected',
    'escalated'
  ));

COMMENT ON COLUMN public.payout_review_queue.status IS
  'pending_review=new flag; held=admin keep on hold; approved=payout released; refunded=customer refunded; rejected=admin denied review; escalated=follow-up';

DROP INDEX IF EXISTS public.idx_payout_review_queue_status;

CREATE INDEX IF NOT EXISTS idx_payout_review_queue_active_status
  ON public.payout_review_queue (status)
  WHERE status IN ('pending_review', 'held');
