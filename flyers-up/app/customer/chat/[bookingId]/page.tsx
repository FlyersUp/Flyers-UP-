'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

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

  async function load() {
    setLoading(true);
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, service_pros(display_name)')
      .eq('id', bookingId)
      .maybeSingle();
    if (booking?.status) setStatus(booking.status);
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
            <Badge variant="highlight">{status.replaceAll('_', ' ').toUpperCase()}</Badge>
          </div>
        </div>

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
              const mine = msg.sender_role === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-xl px-4 py-2 ${
                      mine ? 'bg-accent text-accentContrast' : 'bg-surface2 border border-[var(--hairline)] text-text'
                    }`}
                  >
                    <p>{msg.message}</p>
                    <div className="text-xs text-muted/70 mt-1">
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

