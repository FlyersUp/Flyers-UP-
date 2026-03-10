/**
 * Tracks when user is viewing a conversation.
 * Used to suppress push notifications when recipient is actively reading.
 */

import { useEffect } from 'react';

export function useConversationPresence(conversationId: string | null) {
  useEffect(() => {
    if (!conversationId) return;

    const url = `/api/conversations/${conversationId}/presence`;

    fetch(url, { method: 'POST' }).catch(() => {});

    const interval = setInterval(() => {
      fetch(url, { method: 'POST' }).catch(() => {});
    }, 20_000);

    return () => {
      clearInterval(interval);
      fetch(url, { method: 'DELETE' }).catch(() => {});
    };
  }, [conversationId]);
}
