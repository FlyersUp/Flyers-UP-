import { after } from 'next/server';

/**
 * Schedules work to run after the HTTP response completes (Next.js `after`).
 * Safe for emails, receipts, analytics, notifications — not for booking/payment invariants.
 */
export function enqueueAfterResponse(name: string, task: () => Promise<void>): void {
  after(() => {
    void (async () => {
      try {
        await task();
      } catch (e) {
        console.error('[enqueue]', name, e);
      }
    })();
  });
}
