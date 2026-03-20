'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { BookingChatThread, type ChatItem } from '@/components/chat/BookingChatThread';
import { ConversationChatHeader } from '@/components/chat/ConversationChatHeader';
import { ConversationInput } from '@/components/chat/ConversationInput';
import { ConversationThreadEmpty } from '@/components/chat/ConversationThreadEmpty';

/**
 * Customer Chat - messages + quote cards for price negotiation.
 * When a conversation exists for this customer+pro, redirects to the premium
 * conversation thread. Otherwise shows booking-specific chat (with quotes).
 */
export default function CustomerChat({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [status, setStatus] = useState<string>('requested');
  const [priceStatus, setPriceStatus] = useState<string>('requested');
  const [negotiationRound, setNegotiationRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [proName, setProName] = useState<string>('Pro');
  const [proAvatarUrl, setProAvatarUrl] = useState<string | null>(null);
  const [bookingContext, setBookingContext] = useState<string | null>(null);
  const [isInquiry, setIsInquiry] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const { clearMessagesAlert, clearNotificationsAlert } = useNavAlerts();

  useEffect(() => {
    clearMessagesAlert();
    clearNotificationsAlert();
  }, [clearMessagesAlert, clearNotificationsAlert]);

  // Redirect to premium conversation thread when one exists and no active quote negotiation
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/customer/bookings/${bookingId}/conversation`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.conversationId) return;
        // Keep booking chat when quote negotiation is active (quote cards)
        const inQuoteFlow = ['requested', 'quoted', 'countered'].includes(priceStatus);
        if (inQuoteFlow) return;
        router.replace(`/customer/chat/conversation/${data.conversationId}?booking=${bookingId}`);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bookingId, router, priceStatus]);

  async function load() {
    setLoading(true);
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, address, notes, price_status, negotiation_round, service_date, service_time, service_pros(display_name, user_id, logo_url)')
      .eq('id', bookingId)
      .maybeSingle();
    if (booking?.status) setStatus(booking.status);
    const b = booking as { address?: string; notes?: string; price_status?: string; negotiation_round?: number } | null;
    setPriceStatus(b?.price_status ?? 'requested');
    setNegotiationRound(b?.negotiation_round ?? 0);
    setIsInquiry(
      b?.address === 'To be confirmed' &&
      (b?.notes?.includes('Contact request') ?? false)
    );
    const raw = (booking as { service_pros?: { display_name: string | null; user_id?: string; logo_url?: string | null } | { display_name: string | null; user_id?: string; logo_url?: string | null }[] | null })?.service_pros;
    const pro = Array.isArray(raw) ? raw[0] : raw;
    setProAvatarUrl(pro?.logo_url ?? null);
    let name = pro?.display_name?.trim();
    if (!name && pro?.user_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name')
        .eq('id', pro.user_id)
        .maybeSingle();
      const p = prof as { first_name?: string | null; last_name?: string | null; full_name?: string | null } | null;
      name = p?.full_name?.trim()
        || [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(' ') || undefined;
    }
    setProName(name || 'Pro');
    const bookingDates = booking as { service_date?: string; service_time?: string };
    if (bookingDates?.service_date) {
      try {
        const dateStr = new Date(bookingDates.service_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        setBookingContext(bookingDates.service_time ? `${dateStr} • ${bookingDates.service_time}` : dateStr);
      } catch {
        setBookingContext(bookingDates.service_date);
      }
    } else {
      setBookingContext(null);
    }

    const [msgRes, quoteRes] = await Promise.all([
      supabase
        .from('booking_messages')
        .select('id, sender_role, message, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true }),
      supabase
        .from('booking_quotes')
        .select('id, sender_role, amount, message, action, round, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true }),
    ]);

    const messages = (msgRes.data ?? []).map((m) => ({
      type: 'message' as const,
      id: m.id,
      sender_role: m.sender_role,
      message: m.message,
      created_at: m.created_at,
    }));
    const quotes = (quoteRes.data ?? []).map((q) => ({
      type: 'quote' as const,
      id: q.id,
      sender_role: q.sender_role as 'customer' | 'pro',
      amount: Number(q.amount),
      message: q.message,
      action: q.action,
      round: q.round,
      created_at: q.created_at,
    }));
    const merged: ChatItem[] = [...messages, ...quotes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    setItems(merged);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [bookingId]);

  const handleAcceptQuote = async () => {
    const res = await fetch(`/api/bookings/${bookingId}/accept-quote`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to accept');
      return;
    }
    await load();
  };

  const handleCounter = async (amount: number, msg?: string) => {
    const res = await fetch(`/api/bookings/${bookingId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, message: msg }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to send counter');
      return;
    }
    await load();
  };

  const showPaymentLink = priceStatus === 'accepted' && ['requested', 'awaiting_deposit_payment', 'payment_required'].includes(status);

  const handleSend = useCallback(async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setSendFailed(false);
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSendFailed(true);
        setMessage(text);
        setSending(false);
        return;
      }
      const { error } = await supabase.from('booking_messages').insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_role: 'customer',
        message: text,
      });
      if (error) {
        setSendFailed(true);
        setMessage(text);
      } else {
        await load();
      }
    } catch {
      setSendFailed(true);
      setMessage(text);
    } finally {
      setSending(false);
    }
  }, [bookingId, message, sending]);

  return (
    <AppLayout mode="customer">
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-[#F7F6F4] dark:bg-[#111318]">
        <ConversationChatHeader
          proName={proName}
          proAvatarUrl={proAvatarUrl}
          bookingContext={bookingContext}
          bookingHref={`/customer/bookings/${bookingId}`}
          isInquiry={isInquiry}
        />

        {isInquiry && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-white dark:bg-[#171A20] border border-black/5 dark:border-white/10 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
            When you&apos;re ready to book, start a request from the pro&apos;s profile.
          </div>
        )}

        {showPaymentLink && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-[#B2FBA5]/30 border border-[#9ae88d] dark:border-[#058954]/30">
            <p className="font-semibold text-[#111111] dark:text-[#F5F7FA]">Price agreed!</p>
            <Link
              href={`/customer/bookings/${bookingId}/deposit`}
              className="mt-2 inline-block px-4 py-2 rounded-lg bg-[#058954] text-white font-semibold text-sm hover:bg-[#047a48]"
            >
              Pay deposit
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-2 w-2 rounded-full bg-[#058954]/60 animate-pulse" />
            </div>
          ) : items.length === 0 ? (
            <ConversationThreadEmpty
              title={isInquiry ? 'Ask a question' : 'No messages yet'}
              subtitle={
                isInquiry
                  ? 'Send a message to ask questions – no commitment to book.'
                  : 'Send the first message to coordinate details.'
              }
            />
          ) : (
            <BookingChatThread
              items={items}
              isCustomer={true}
              otherPartyName={proName}
              priceStatus={priceStatus}
              negotiationRound={negotiationRound}
              onAcceptQuote={handleAcceptQuote}
              onCounter={handleCounter}
              bookingId={bookingId}
            />
          )}
        </div>

        {sendFailed && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            Message failed to send. Try again.
          </div>
        )}

        <ConversationInput
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          placeholder="Message your pro…"
          sending={sending}
        />
      </div>
    </AppLayout>
  );
}

