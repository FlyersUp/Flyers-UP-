'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';

/**
 * Customer Chat - Screen 10
 * Chat interface with pro, system messages
 */
export default function CustomerChat({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState<Array<{ id: string; sender_role: string; message: string; created_at: string }>>([]);
  const [status, setStatus] = useState<string>('requested');
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
      .select('status, address, notes, service_pros(display_name)')
      .eq('id', bookingId)
      .maybeSingle();
    if (booking?.status) setStatus(booking.status);
    const b = booking as { address?: string; notes?: string } | null;
    setIsInquiry(
      b?.address === 'To be confirmed' &&
      (b?.notes?.includes('Contact request') ?? false)
    );
    const raw = (booking as { service_pros?: { display_name: string | null } | { display_name: string | null }[] | null })?.service_pros;
    const pro = Array.isArray(raw) ? raw[0] : raw;
    setProName(pro?.display_name?.trim() || 'Pro');

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
    <AppLayout mode="customer">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        {/* Header */}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {loading ? (
            <p className="text-sm text-muted/70">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center">
              <Label className="bg-surface2">{isInquiry ? 'ASK A QUESTION' : 'NO MESSAGES YET'}</Label>
              <div className="text-xs text-muted/70 mt-1">
                {isInquiry
                  ? 'Send a message to ask questions – no commitment to book.'
                  : 'Send the first message to coordinate details.'}
              </div>
            </div>
          ) : (
            rows.map((msg) => {
              const mine = msg.sender_role === 'customer';
              const isCustomer = msg.sender_role === 'customer';
              const bubbleStyle = isCustomer
                ? 'bg-[#b2fba5] text-gray-900 border border-[#9ae88d]'
                : 'bg-amber-100 text-gray-900 border border-amber-200';
              const senderName = isCustomer ? 'You' : proName;
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

