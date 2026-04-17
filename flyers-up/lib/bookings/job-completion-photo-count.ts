/**
 * Counts completion "after" photo URLs that satisfy payout evidence rules.
 * Used for auto-confirm / ops tooling; automatic payout release does not gate on photo count.
 */
export function countValidJobCompletionAfterPhotoUrls(urls: unknown): number {
  if (!Array.isArray(urls)) return 0;
  return urls.filter(
    (u): u is string =>
      typeof u === 'string' &&
      u.trim().length > 5 &&
      !/^(placeholder|n\/a|none|null|undefined)$/i.test(u.trim())
  ).length;
}
