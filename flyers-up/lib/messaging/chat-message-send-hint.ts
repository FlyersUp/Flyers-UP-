import { MESSAGING_BLOCKED_USER_MESSAGE } from '@/lib/messaging/messaging-blocked-copy';
import { CHAT_MESSAGE_ERROR_CODES, RECIPIENT_INACTIVE_MESSAGE } from '@/lib/messaging/chat-message-errors';

/** Single default for customer + pro booking chat send failures. */
export const CHAT_SEND_DEFAULT_ERROR_HINT = 'Message could not be sent. Try again.';

/**
 * Map POST /api/.../messages JSON body to a user-visible banner hint.
 * Prefer stable `code` when present so copy stays consistent with product strings.
 */
export function hintFromChatMessageApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return CHAT_SEND_DEFAULT_ERROR_HINT;
  const d = data as { code?: unknown; error?: unknown };
  if (d.code === CHAT_MESSAGE_ERROR_CODES.MESSAGING_BLOCKED) {
    return MESSAGING_BLOCKED_USER_MESSAGE;
  }
  if (d.code === CHAT_MESSAGE_ERROR_CODES.RECIPIENT_INACTIVE) {
    return RECIPIENT_INACTIVE_MESSAGE;
  }
  if (d.code === CHAT_MESSAGE_ERROR_CODES.RATE_LIMITED) {
    return "You're sending messages too quickly. Please wait a moment and try again.";
  }
  if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
  return CHAT_SEND_DEFAULT_ERROR_HINT;
}
