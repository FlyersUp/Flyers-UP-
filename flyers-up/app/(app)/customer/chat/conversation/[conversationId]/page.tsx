'use client';

/**
 * Customer Conversation Chat — premium messaging UI
 *
 * Uses conversation_messages (Supabase). Airbnb-level clarity, iMessage-style bubbles,
 * Stripe/Linear polish. Mobile-first, calm, premium.
 *
 * Query param ?booking=xxx: when redirected from booking chat, shows booking context.
 */
import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { ConversationChatHeader } from '@/components/chat/ConversationChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ConversationInput } from '@/components/chat/ConversationInput';
import { ConversationThreadEmpty } from '@/components/chat/ConversationThreadEmpty';
import { ConversationThreadError } from '@/components/chat/ConversationThreadError';

interface MessageRow {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface ConversationMeta {
  proName: string;
  proAvatarUrl: string | null;
  bookingContext: string | null;
  bookingHref: string | null;
  isInquiry: boolean;
}

export default function CustomerConversationChat({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const searchParams = useSearchParams();
  const bookingIdFromQuery = searchParams.get('booking');
  useConversationPresence(conversationId);
  const { clearMessagesAlert, clearNotificationsAlert } = useNavAlerts();

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('id, pro_id, customer_id, service_pros(display_name, user_id, logo_url)')
        .eq('id', conversationId)
        .maybeSingle();

      if (convErr || !conv) {
        setError('Conversation not found');
        setLoading(false);
        return;
      }

      const raw = (conv as { service_pros?: { display_name?: string | null; user_id?: string; logo_url?: string | null } | { display_name?: string | null; user_id?: string; logo_url?: string | null }[] | null })?.service_pros;
      const pro = Array.isArray(raw) ? raw[0] : raw;
      let proName = pro?.display_name?.trim() ?? 'Pro';
      const proAvatarUrl = pro?.logo_url ?? null;

      if (!proName && pro?.user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name')
          .eq('id', pro.user_id)
          .maybeSingle();
        const p = prof as { first_name?: string | null; last_name?: string | null; full_name?: string | null } | null;
        proName = p?.full_name?.trim()
          || [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(' ')
          || 'Pro';
      }

      let bookingContext: string | null = null;
      let bookingHref: string | null = null;
      let isInquiry = true;

      if (bookingIdFromQuery) {
        const { data: b } = await supabase
          .from('bookings')
          .select('id, service_date, service_time, status')
          .eq('id', bookingIdFromQuery)
          .eq('customer_id', (conv as { customer_id?: string }).customer_id)
          .maybeSingle();
        if (b) {
          const d = (b as { service_date?: string; service_time?: string }).service_date;
          const t = (b as { service_date?: string; service_time?: string }).service_time;
          if (d) {
            try {
              const dateStr = new Date(d).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              bookingContext = t ? `${dateStr} • ${t}` : dateStr;
            } catch {
              bookingContext = d;
            }
          }
          bookingHref = `/customer/bookings/${bookingIdFromQuery}`;
          isInquiry = false;
        }
      }

      setMeta({
        proName,
        proAvatarUrl,
        bookingContext,
        bookingHref,
        isInquiry,
      });

      const { data: msgs, error: msgErr } = await supabase
        .from('conversation_messages')
        .select('id, sender_role, message, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgErr) {
        setError('Could not load messages');
      } else {
        setMessages((msgs as MessageRow[]) ?? []);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    clearMessagesAlert();
    clearNotificationsAlert();
  }, [clearMessagesAlert, clearNotificationsAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queueMicrotask(() => {
            const row = payload.new as MessageRow;
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, row].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setSendFailed(false);
    setInput('');

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSendFailed(true);
        setInput(text);
        setError(data.error ?? 'Failed to send');
      }
    } catch {
      setSendFailed(true);
      setInput(text);
      setError('Could not send message');
    } finally {
      setSending(false);
    }
  }, [conversationId, input, sending]);

  if (loading && !meta) {
    return (
      <AppLayout mode="customer">
        <div className="flex flex-col h-screen max-w-4xl mx-auto bg-[#F7F6F4] dark:bg-[#111318]">
          <div className="h-14 bg-white dark:bg-[#171A20] animate-pulse" />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">Loading conversation…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !meta) {
    return (
      <AppLayout mode="customer">
        <div className="flex flex-col h-screen max-w-4xl mx-auto bg-[#F7F6F4] dark:bg-[#111318]">
          <ConversationThreadError message={error} onRetry={load} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-[#F7F6F4] dark:bg-[#111318]">
        {meta && (
          <ConversationChatHeader
            proName={meta.proName}
            proAvatarUrl={meta.proAvatarUrl}
            bookingContext={meta.bookingContext}
            bookingHref={meta.bookingHref}
            isInquiry={meta.isInquiry}
          />
        )}

        {meta?.isInquiry && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-white dark:bg-[#171A20] border border-black/5 dark:border-white/10 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
            When you&apos;re ready to book, start a request from the pro&apos;s profile.
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0"
          role="log"
          aria-live="polite"
          aria-label="Message thread"
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-2 w-2 rounded-full bg-[#058954]/60 animate-pulse" />
            </div>
          ) : messages.length === 0 ? (
            <ConversationThreadEmpty
              title="Start the conversation"
              subtitle="Send a message to ask questions or coordinate details."
            />
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                id={msg.id}
                message={msg.message}
                createdAt={msg.created_at}
                isMine={msg.sender_role === 'customer'}
              />
            ))
          )}
        </div>

        {sendFailed && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            Message failed to send. Try again.
          </div>
        )}

        <ConversationInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder="Message your pro…"
          sending={sending}
          showAttachmentPlaceholder={false}
        />
      </div>
    </AppLayout>
  );
}
