/**
 * Counts completion "after" photo URLs that satisfy payout evidence rules.
 * Keep in sync with {@link buildPayoutReleaseEligibilitySnapshot} photo proof.
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
