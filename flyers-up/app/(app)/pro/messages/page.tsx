'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { StatusBadge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useEffect, useState } from 'react';

type ThreadRow = {
  id: string;
  type: 'booking' | 'conversation';
  bookingId?: string;
  conversationId?: string;
  status: string;
  date: string;
  time: string;
  lastMessage: string;
  lastAt: string | null;
  otherPartyName: string;
  isInquiry: boolean;
};

export default function ProMessagesPage() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { clearMessagesAlert, clearNotificationsAlert } = useNavAlerts();

  useEffect(() => {
    clearMessagesAlert();
    clearNotificationsAlert();
  }, [clearMessagesAlert, clearNotificationsAlert]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const { data: proRow } = await supabase
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const proId = proRow?.id;
      if (!proId) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const rows: ThreadRow[] = [];

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, address, notes, service_date, service_time, created_at, customer_id')
        .eq('pro_id', proId)
        .order('created_at', { ascending: false })
        .limit(25);

      const b = (bookings || []) as Array<{
        id: string;
        status: string;
        address?: string;
        notes?: string;
        service_date: string;
        service_time: string;
        created_at: string;
        customer_id: string;
      }>;

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, created_at, customer_id')
        .eq('pro_id', proId)
        .order('created_at', { ascending: false })
        .limit(25);

      const convs = (conversations || []) as Array<{
        id: string;
        created_at: string;
        customer_id: string;
      }>;

      const customerIds = [...new Set([
        ...b.map((x) => x.customer_id),
        ...convs.map((c) => c.customer_id),
      ].filter(Boolean))];
      const profileById = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name')
          .in('id', customerIds);
        (profiles ?? []).forEach((p: { id: string; first_name?: string | null; last_name?: string | null; full_name?: string | null }) => {
          const name = p.full_name?.trim()
            || [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ')
            || 'Customer';
          profileById.set(p.id, name);
        });
      }

      for (const booking of b) {
        const { data: last } = await supabase
          .from('booking_messages')
          .select('message, created_at')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastRow = (last && last[0]) as { message: string; created_at: string } | undefined;
        const customerName = profileById.get(booking.customer_id) || 'Customer';
        const isInquiry =
          booking.address === 'To be confirmed' &&
          (booking.notes?.includes('Contact request') ?? false);
        rows.push({
          id: booking.id,
          type: 'booking',
          bookingId: booking.id,
          status: booking.status,
          date: booking.service_date,
          time: booking.service_time,
          lastMessage: lastRow?.message ?? 'No messages yet',
          lastAt: lastRow?.created_at ?? null,
          otherPartyName: customerName,
          isInquiry,
        });
      }

      for (const conv of convs) {
        const { data: last } = await supabase
          .from('conversation_messages')
          .select('message, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastRow = (last && last[0]) as { message: string; created_at: string } | undefined;
        const customerName = profileById.get(conv.customer_id) || 'Customer';
        const d = new Date(conv.created_at);
        rows.push({
          id: conv.id,
          type: 'conversation',
          conversationId: conv.id,
          status: 'inquiry',
          date: d.toISOString().slice(0, 10),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastMessage: lastRow?.message ?? 'No messages yet',
          lastAt: lastRow?.created_at ?? null,
          otherPartyName: customerName,
          isInquiry: true,
        });
      }

      rows.sort((a, b) => {
        const atA = a.lastAt ?? a.date + 'T' + a.time;
        const atB = b.lastAt ?? b.date + 'T' + b.time;
        return new Date(atB).getTime() - new Date(atA).getTime();
      });

      if (!mounted) return;
      setThreads(rows.slice(0, 50));
      setLoading(false);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Label className="mb-2 block">Messages</Label>
          <h1 className="text-2xl font-semibold text-text">Messages</h1>
          <p className="text-muted mt-1">Your conversations with customers will show up here.</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted/70">Loading…</p>
        ) : (
          <div className="space-y-4">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={t.type === 'conversation' ? `/pro/chat/conversation/${t.conversationId}` : `/pro/chat/${t.bookingId}`}
                className="block"
              >
                <Card withRail>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-text">{t.otherPartyName}</div>
                      <div className="text-sm text-muted mt-0.5 truncate">{t.lastMessage}</div>
                      <div className="mt-2">
                        {t.isInquiry ? (
                          <span className="inline-flex h-6 px-2.5 rounded-full border border-badgeBorder bg-badgeFill text-muted text-[11px] uppercase tracking-wide font-medium">
                            Inquiry
                          </span>
                        ) : (
                          <StatusBadge status={t.status} />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted/70 whitespace-nowrap text-right">
                      <div>{new Date(t.date).toLocaleDateString()}</div>
                      <div>{t.time}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
            {threads.length === 0 ? (
              <Card className="p-5">
                <div className="text-sm font-semibold text-text">No messages yet</div>
                <div className="text-sm text-muted mt-1">When a customer requests service, your thread will appear here.</div>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

