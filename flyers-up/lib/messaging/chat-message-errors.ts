/**
 * Shared API contract for booking + conversation message POST routes.
 */

export const CHAT_MESSAGE_ERROR_CODES = {
  MESSAGING_BLOCKED: 'messaging_blocked',
  RECIPIENT_INACTIVE: 'recipient_inactive',
  RATE_LIMITED: 'rate_limited',
} as const;

export type ChatMessageErrorCode = (typeof CHAT_MESSAGE_ERROR_CODES)[keyof typeof CHAT_MESSAGE_ERROR_CODES];

export const RECIPIENT_INACTIVE_MESSAGE =
  "This account can't receive messages right now.";

/** Trim, normalize newlines, collapse runs of spaces/tabs, cap excessive blank lines. */
export function normalizeChatMessageBody(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
