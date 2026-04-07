/**
 * Human-readable relative time (notifications, Fly Wall, etc.).
 */
export function formatCompletedAgo(iso: string, nowMs: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Recently';
  let diffSec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 5) return diffWk === 1 ? '1 week ago' : `${diffWk} weeks ago`;
  const diffMo = Math.floor(diffDay / 30);
  return diffMo <= 1 ? '1 month ago' : `${diffMo} months ago`;
}

export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  return formatCompletedAgo(iso, nowMs);
}
