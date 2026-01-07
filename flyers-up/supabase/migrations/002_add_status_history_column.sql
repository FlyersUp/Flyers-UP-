-- ============================================
-- MIGRATION: Add status_history JSONB column to bookings
-- ============================================
-- Run this migration if you already have the base schema deployed.
-- This adds a status_history column to track the timeline of status changes.
--
-- If setting up from scratch, update the main schema.sql instead.
-- ============================================

-- ============================================
-- 1. ADD STATUS_HISTORY COLUMN
-- ============================================
-- JSONB column to store array of status history entries
-- Each entry has: { "status": "accepted", "at": "2025-11-25T10:00:00Z" }

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN public.bookings.status_history IS 
  'Timeline of status changes. Array of objects: [{ "status": string, "at": ISO timestamp }]';


-- ============================================
-- 2. OPTIONAL: BACKFILL EXISTING BOOKINGS
-- ============================================
-- For existing bookings without status_history, initialize with current status
-- This uses created_at as the timestamp for the initial status

UPDATE public.bookings
SET status_history = jsonb_build_array(
  jsonb_build_object(
    'status', 'requested',
    'at', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
)
WHERE status_history IS NULL OR status_history = '[]'::jsonb;

-- For bookings that are not 'requested', add the current status too
-- This is a simple backfill - we use NOW() since we don't know when the status actually changed
UPDATE public.bookings
SET status_history = status_history || jsonb_build_array(
  jsonb_build_object(
    'status', status,
    'at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
)
WHERE status != 'requested' 
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(status_history) elem 
    WHERE elem->>'status' = status
  );


-- ============================================
-- 3. CREATE INDEX FOR EFFICIENT QUERYING
-- ============================================
-- GIN index for querying JSONB data if needed later
-- (e.g., finding all bookings that went through a specific status)

CREATE INDEX IF NOT EXISTS idx_bookings_status_history 
  ON public.bookings USING GIN (status_history);


-- ============================================
-- VERIFICATION
-- ============================================
-- After running, verify with:
-- SELECT id, status, status_history FROM public.bookings LIMIT 5;
-- 
-- Example output:
-- id                                   | status    | status_history
-- -------------------------------------+-----------+------------------------------------------
-- abc123...                            | accepted  | [{"at": "2025-11-25T09:00:00Z", "status": "requested"}, 
--                                      |           |  {"at": "2025-11-25T10:30:00Z", "status": "accepted"}]





