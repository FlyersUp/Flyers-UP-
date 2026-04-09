/**
 * Single official support address for Flyers Up (Phase 1).
 * Use these helpers instead of scattering literals — public legal pages may still show
 * support@flyersup.app in prose when it must match printed policy text without env coupling.
 *
 * Client UI: OFFICIAL_SUPPORT_EMAIL_DISPLAY
 * Server (API routes, actions, Resend "to"): getSupportInboxEmail()
 */
export const OFFICIAL_SUPPORT_EMAIL_DISPLAY =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OFFICIAL_SUPPORT_EMAIL?.trim()) ||
  'support@flyersup.app';

/**
 * Server-only: inbox for ticket notifications and server-rendered mailto targets.
 * Precedence: SUPPORT_INBOX_EMAIL → OFFICIAL_SUPPORT_EMAIL → NEXT_PUBLIC → default.
 */
export function getSupportInboxEmail(): string {
  return (
    process.env.SUPPORT_INBOX_EMAIL?.trim() ||
    process.env.OFFICIAL_SUPPORT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_OFFICIAL_SUPPORT_EMAIL?.trim() ||
    'support@flyersup.app'
  );
}
