'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useEffect, useState } from 'react';
import { ConversationCard, type ConversationCardItem } from '@/components/messages/ConversationCard';
import { EmptyState } from '@/components/messages/EmptyState';

type ThreadRow = ConversationCardItem;

export default function CustomerMessagesPage() {
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

      const rows: ThreadRow[] = [];

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, address, notes, service_date, service_time, created_at, service_pros(display_name, user_id)')
        .eq('customer_id', user.id)
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
        service_pros?: { display_name: string | null; user_id: string } | { display_name: string | null; user_id: string }[] | null;
      }>;

      const proUserIds = [...new Set(b.map((x) => {
        const raw = x.service_pros;
        const pro = Array.isArray(raw) ? raw[0] : raw;
        return pro?.user_id;
      }).filter(Boolean))] as string[];
      const proProfileByName = new Map<string, string>();
      if (proUserIds.length > 0) {
        const { data: proProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name')
          .in('id', proUserIds);
        (proProfiles ?? []).forEach((p: { id: string; first_name?: string | null; last_name?: string | null; full_name?: string | null }) => {
          const name = p.full_name?.trim()
            || [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ');
          if (name) proProfileByName.set(p.id, name);
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
        const raw = booking.service_pros;
        const pro = Array.isArray(raw) ? raw[0] : raw;
        const proName = pro?.display_name?.trim()
          || (pro?.user_id ? proProfileByName.get(pro.user_id) : null)
          || 'Pro';
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
          otherPartyName: proName,
          isInquiry,
        });
      }

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, created_at, service_pros(display_name, user_id)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      const convs = (conversations || []) as Array<{
        id: string;
        created_at: string;
        service_pros?: { display_name: string | null; user_id: string } | { display_name: string | null; user_id: string }[] | null;
      }>;

      const convProUserIds = [...new Set(convs.map((c) => {
        const raw = c.service_pros;
        const pro = Array.isArray(raw) ? raw[0] : raw;
        return pro?.user_id;
      }).filter(Boolean))] as string[];
      const convProProfileByName = new Map<string, string>();
      if (convProUserIds.length > 0) {
        const { data: convProProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name')
          .in('id', convProUserIds);
        (convProProfiles ?? []).forEach((p: { id: string; first_name?: string | null; last_name?: string | null; full_name?: string | null }) => {
          const name = p.full_name?.trim()
            || [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ');
          if (name) convProProfileByName.set(p.id, name);
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
        const raw = conv.service_pros;
        const pro = Array.isArray(raw) ? raw[0] : raw;
        const proName = pro?.display_name?.trim()
          || (pro?.user_id ? convProProfileByName.get(pro.user_id) : null)
          || 'Pro';
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
          otherPartyName: proName,
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
    <AppLayout mode="customer">
      <CustomerPageShell
        title="Messages"
        subtitle="Your conversations with pros will show up here."
      >
        <div className="max-w-4xl mx-auto px-4 pt-2 bg-transparent">
          {loading ? (
            <p className="text-sm text-[#6B7280] dark:text-[#A1A8B3]">Loading…</p>
          ) : threads.length === 0 ? (
            <EmptyState
            variant="list"
              title="Start the conversation"
              subtitle="When you send a request or inquiry, your thread will appear here."
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
                  href={t.type === 'conversation' ? `/customer/chat/conversation/${t.conversationId}` : `/customer/chat/${t.bookingId}`}
                />
              ))}
            </div>
          )}
        </div>
      </CustomerPageShell>
    </AppLayout>
  );
}

