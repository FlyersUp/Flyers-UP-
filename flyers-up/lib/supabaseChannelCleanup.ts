/**
 * Defer Supabase Realtime channel removal to break synchronous recursion
 * (RangeError: Maximum call stack) when removeChannel triggers callbacks that
 * call removeChannel again — see supabase-js realtime _trigger / _matchReceive.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function scheduleRemoveSupabaseChannel(
  client: SupabaseClient,
  channel: RealtimeChannel | null | undefined
): void {
  if (!channel) return;
  const ch = channel;
  queueMicrotask(() => {
    try {
      void client.removeChannel(ch);
    } catch {
      try {
        ch.unsubscribe();
      } catch {
        /* ignore */
      }
    }
  });
}
