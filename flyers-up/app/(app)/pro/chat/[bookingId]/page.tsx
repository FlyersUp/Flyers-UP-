'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';

/**
 * Pro Chat - Screen 18
 * Chat interface styled in Pro mode (orange)
 */
export default function ProChat({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState<Array<{ id: string; sender_role: string; message: string; created_at: string }>>([]);
  const [status, setStatus] = useState<string>('requested');
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>('Customer');
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
      .select('status, address, notes, customer_id')
      .eq('id', bookingId)
      .maybeSingle();
    if (booking?.status) setStatus(booking.status);
    const b = booking as { address?: string; notes?: string } | null;
    setIsInquiry(
      b?.address === 'To be confirmed' &&
      (b?.notes?.includes('Contact request') ?? false)
    );
    const custId = (booking as { customer_id?: string })?.customer_id;
    if (custId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name')
        .eq('id', custId)
        .maybeSingle();
      const p = profile as { first_name?: string | null; last_name?: string | null; full_name?: string | null } | null;
      const name = p?.full_name?.trim()
        || [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(' ')
        || 'Customer';
      setCustomerName(name);
    }

    const { data } = await supabase
      .from('booking_messages')
      .select('id, sender_role, message, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    setRows((data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return (
    <AppLayout mode="pro">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        {/* Header */}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {loading ? (
            <p className="text-sm text-muted/70">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center">
              <Label className="bg-surface2">NO MESSAGES YET</Label>
              <div className="text-xs text-muted/70 mt-1">Send the first message to coordinate details.</div>
            </div>
          ) : (
            rows.map((msg) => {
              const mine = msg.sender_role === 'pro';
              const isCustomer = msg.sender_role === 'customer';
              const bubbleStyle = isCustomer
                ? 'bg-[#b2fba5] text-gray-900 border border-[#9ae88d]'
                : 'bg-amber-100 text-gray-900 border border-amber-200';
              const senderName = isCustomer ? customerName : 'You';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-xs font-medium text-muted mb-0.5">{senderName}</span>
                  <div
                    className={`max-w-xs rounded-xl px-4 py-2 ${bubbleStyle}`}
                  >
                    <p>{msg.message}</p>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
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

