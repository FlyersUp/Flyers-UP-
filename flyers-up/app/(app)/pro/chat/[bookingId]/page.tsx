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
 * Pro Chat - messages + quote cards, send quote / accept budget
 */
export default function ProChat({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [status, setStatus] = useState<string>('requested');
  const [priceStatus, setPriceStatus] = useState<string>('requested');
  const [negotiationRound, setNegotiationRound] = useState(0);
  const [customerBudget, setCustomerBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>('Customer');
  const [isInquiry, setIsInquiry] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const { clearMessagesAlert, clearNotificationsAlert } = useNavAlerts();

  useEffect(() => {
    clearMessagesAlert();
    clearNotificationsAlert();
  }, [clearMessagesAlert, clearNotificationsAlert]);

  async function load() {
    setLoading(true);
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, address, notes, customer_id, price_status, negotiation_round, customer_budget')
      .eq('id', bookingId)
      .maybeSingle();
    if (booking?.status) setStatus(booking.status);
    const b = booking as { address?: string; notes?: string; price_status?: string; negotiation_round?: number; customer_budget?: number } | null;
    setPriceStatus(b?.price_status ?? 'requested');
    setNegotiationRound(b?.negotiation_round ?? 0);
    setCustomerBudget(b?.customer_budget ?? null);
    setIsInquiry(
      b?.address === 'To be confirmed' &&
      (b?.notes?.includes('Contact request') ?? false)
    );
    const custId = (booking as { customer_id?: string })?.customer_id;
    if (custId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, email')
        .eq('id', custId)
        .maybeSingle();
      const p = profile as { first_name?: string | null; last_name?: string | null; full_name?: string | null; email?: string | null } | null;
      const name = p?.full_name?.trim()
        || [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(' ')
        || (p?.email ? (p.email.split('@')[0] || p.email) : null);
      setCustomerName(name?.trim() || 'Customer');
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

  const handleSendQuote = async (amount: number, msg?: string) => {
    const res = await fetch(`/api/bookings/${bookingId}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, message: msg }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to send quote');
      return;
    }
    await load();
  };

  const handleAcceptBudget = async () => {
    if (customerBudget == null || customerBudget <= 0) return;
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: customerBudget }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? 'Failed to accept budget');
        return;
      }
      await load();
    } finally {
      setQuoteLoading(false);
    }
  };

  const canSendQuote =
    !isInquiry &&
    status === 'requested' &&
    ['requested', 'countered'].includes(priceStatus) &&
    negotiationRound < 2;
  const canAcceptBudget =
    !isInquiry &&
    status === 'requested' &&
    customerBudget != null &&
    customerBudget > 0 &&
    priceStatus === 'requested';

  return (
    <AppLayout mode="pro">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        <div className="bg-surface border-b border-[var(--surface-border)] px-4 py-4 flex items-center gap-4">
          <Link href="/pro/messages" className="text-muted hover:text-text">
            ←
          </Link>
          <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center">
            <span className="text-muted">P</span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-text">{customerName}</div>
            {isInquiry ? (
              <span className="text-xs text-muted">Inquiry – questions only, no booking yet</span>
            ) : (
              <Badge variant="highlight">{status.replaceAll('_', ' ').toUpperCase()}</Badge>
            )}
          </div>
        </div>

        {isInquiry && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-surface2 border border-[var(--surface-border)] text-sm text-muted">
            Customer is asking questions. They can start a booking when they&apos;re ready.
          </div>
        )}

        {/* Pro: Accept budget / Send quote */}
        {!isInquiry && (canAcceptBudget || canSendQuote) && (
          <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-[#FFC067]/20 border border-amber-200">
            {canAcceptBudget && (
              <div className="mb-2">
                <p className="text-sm font-medium text-[#111]">Customer budget: ${customerBudget!.toFixed(2)}</p>
                <Button
                  onClick={handleAcceptBudget}
                  disabled={quoteLoading}
                  showArrow={false}
                  className="mt-2 px-4 py-2 text-sm bg-[#FFC067] text-black"
                >
                  {quoteLoading ? '…' : 'Accept budget'}
                </Button>
              </div>
            )}
            {canSendQuote && (
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Your quote ($)"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Optional message"
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  className="text-sm"
                />
                <Button
                  onClick={async () => {
                    const amt = parseFloat(quoteAmount);
                    if (!Number.isFinite(amt) || amt < 0) return;
                    setQuoteLoading(true);
                    try {
                      await handleSendQuote(amt, quoteMessage.trim() || undefined);
                      setQuoteAmount('');
                      setQuoteMessage('');
                    } finally {
                      setQuoteLoading(false);
                    }
                  }}
                  disabled={quoteLoading}
                  showArrow={false}
                  className="px-4 py-2 text-sm bg-[#FFC067] text-black"
                >
                  {quoteLoading ? '…' : 'Send quote'}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6 bg-[#F5F5F5]">
          {loading ? (
            <p className="text-sm text-muted/70">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState
              variant="thread"
              title="No messages yet"
              subtitle="Send the first message or a quote to coordinate."
              ctaLabel="Message customer"
              ctaDisabled
              ctaTooltip="Use the input below to send a message"
            />
          ) : (
            <BookingChatThread
              items={items}
              isCustomer={false}
              otherPartyName={customerName}
              priceStatus={priceStatus}
              negotiationRound={negotiationRound}
              onSendQuote={handleSendQuote}
              bookingId={bookingId}
            />
          )}
        </div>

        {!isInquiry && (
          <div className="px-4 py-2 flex flex-wrap gap-2 bg-surface border-t border-[var(--surface-border)]">
            {['On my way', 'Running 10 minutes late', 'Need access instructions', 'Job finished'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  await supabase.from('booking_messages').insert({
                    booking_id: bookingId,
                    sender_id: user.id,
                    sender_role: 'pro',
                    message: preset,
                  });
                  await load();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FFC067]/30 text-gray-800 border border-amber-200 hover:bg-[#FFC067]/50 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

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
                  sender_role: 'pro',
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

