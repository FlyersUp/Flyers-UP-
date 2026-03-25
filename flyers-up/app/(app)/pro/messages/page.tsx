'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useEffect, useState } from 'react';
import { ConversationCard, type ConversationCardItem } from '@/components/messages/ConversationCard';
import { EmptyState } from '@/components/messages/EmptyState';
import { localCalendarDateToYmd } from '@/lib/datetime';

type ThreadRow = ConversationCardItem;

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
          .select('id, first_name, last_name, full_name, email')
          .in('id', customerIds);
        (profiles ?? []).forEach((p: { id: string; first_name?: string | null; last_name?: string | null; full_name?: string | null; email?: string | null }) => {
          const name = p.full_name?.trim()
            || [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ')
            || (p.email ? (p.email.split('@')[0] || p.email) : null)
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
          date: localCalendarDateToYmd(d),
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
      <ProPageShell
        title="Messages"
        subtitle="Your conversations with customers will show up here."
      >
        <div className="max-w-4xl mx-auto px-4 pt-2 bg-transparent">
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading…</p>
          ) : threads.length === 0 ? (
            <EmptyState
              variant="list"
              title="Start the conversation"
              subtitle="When a customer requests service or sends an inquiry, your thread will appear here."
              ctaLabel="Send a message"
              ctaDisabled
              ctaTooltip="Select a booking to message"
            />
          ) : (
            <div className="space-y-3">
              {threads.map((t) => (
                <ConversationCard
                  key={t.id}
                  item={t}
                  href={t.type === 'conversation' ? `/pro/chat/conversation/${t.conversationId}` : `/pro/chat/${t.bookingId}`}
                />
              ))}
            </div>
          )}
        </div>
      </ProPageShell>
    </AppLayout>
  );
}

