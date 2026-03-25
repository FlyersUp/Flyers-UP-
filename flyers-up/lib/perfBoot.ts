/**
 * Opt-in boot performance logging. Set NEXT_PUBLIC_PERF_LOG=1 to enable in the browser.
 */

export function perfLoggingEnabled(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_PERF_LOG === '1'
  );
}

export function perfLog(label: string, ms: number, extra?: string): void {
  if (!perfLoggingEnabled()) return;
  const tail = extra ? ` ${extra}` : '';
  console.log(`[perf] ${label} in ${Math.round(ms)}ms${tail}`);
}

let getCurrentUserCallCount = 0;

export function perfNoteGetCurrentUser(): void {
  if (!perfLoggingEnabled()) return;
  getCurrentUserCallCount += 1;
  if (getCurrentUserCallCount > 1) {
    console.warn(`[perf] getCurrentUser invoked ${getCurrentUserCallCount} times this session`);
  }
}
