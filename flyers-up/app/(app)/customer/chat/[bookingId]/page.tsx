'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/messages/EmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { BookingChatThread, type ChatItem } from '@/components/chat/BookingChatThread';

/**
 * Customer Chat - messages + quote cards for price negotiation
 */
export default function CustomerChat({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [status, setStatus] = useState<string>('requested');
  const [priceStatus, setPriceStatus] = useState<string>('requested');
  const [negotiationRound, setNegotiationRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [proName, setProName] = useState<string>('Pro');
  const [isInquiry, setIsInquiry] = useState(false);
  const { clearMessagesAlert, clearNotificationsAlert } = useNavAlerts();

  useEffect(() => {
    clearMessagesAlert();
    clearNotificationsAlert();
  }, [clearMessagesAlert, clearNotificationsAlert]);

  async function load() {
    setLoading(true);
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, address, notes, price_status, negotiation_round, service_pros(display_name, user_id)')
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
    const raw = (booking as { service_pros?: { display_name: string | null; user_id?: string } | { display_name: string | null; user_id?: string }[] | null })?.service_pros;
    const pro = Array.isArray(raw) ? raw[0] : raw;
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

  return (
    <AppLayout mode="customer">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        <div className="bg-surface border-b border-[var(--surface-border)] px-4 py-4 flex items-center gap-4">
          <Link href="/customer/messages" className="text-muted hover:text-text">
            ←
          </Link>
          <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center">
            <span className="text-muted">C</span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-text">{proName}</div>
            {isInquiry ? (
              <span className="text-xs text-muted">Questions only – no booking yet</span>
            ) : (
              <Badge variant="highlight">{status.replaceAll('_', ' ').toUpperCase()}</Badge>
            )}
          </div>
        </div>

        {isInquiry && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-surface2 border border-[var(--surface-border)] text-sm text-muted">
            You&apos;re just asking questions. When you&apos;re ready to book, start a request from the pro&apos;s profile.
          </div>
        )}

        {showPaymentLink && (
          <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-[#B2FBA5]/30 border border-[#9ae88d]">
            <p className="font-semibold text-[#111]">Price agreed!</p>
            <Link
              href={`/customer/bookings/${bookingId}/checkout`}
              className="mt-2 inline-block px-4 py-2 rounded-lg bg-[#B2FBA5] text-black font-semibold text-sm hover:opacity-95"
            >
              Pay deposit
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6 bg-[#F5F5F5]">
          {loading ? (
            <p className="text-sm text-muted/70">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState
              variant="thread"
              title={isInquiry ? 'Ask a question' : 'No messages yet'}
              subtitle={
                isInquiry
                  ? 'Send a message to ask questions – no commitment to book.'
                  : 'Send the first message to coordinate details.'
              }
              ctaLabel="Message pro"
              ctaDisabled
              ctaTooltip="Use the input below to send a message"
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

        <div className="bg-surface border-t border-[var(--surface-border)] px-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={async () => {
                const text = message.trim();
                if (!text) return;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from('booking_messages').insert({
                  booking_id: bookingId,
                  sender_id: user.id,
                  sender_role: 'customer',
                  message: text,
                });
                setMessage('');
                await load();
              }}
              showArrow={false}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

