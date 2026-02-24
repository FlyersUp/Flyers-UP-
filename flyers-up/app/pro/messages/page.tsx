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
  bookingId: string;
  status: string;
  date: string;
  time: string;
  lastMessage: string;
  otherPartyName: string;
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

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, service_date, service_time, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(25);

      const b = (bookings || []) as Array<{
        id: string;
        status: string;
        service_date: string;
        service_time: string;
        created_at: string;
        customer_id: string;
      }>;

      const customerIds = [...new Set(b.map((x) => x.customer_id).filter(Boolean))];
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

      const rows: ThreadRow[] = [];
      for (const booking of b) {
        const { data: last } = await supabase
          .from('booking_messages')
          .select('message, created_at')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastRow = (last && last[0]) as { message: string } | undefined;
        const customerName = profileById.get(booking.customer_id) || 'Customer';
        rows.push({
          bookingId: booking.id,
          status: booking.status,
          date: booking.service_date,
          time: booking.service_time,
          lastMessage: lastRow?.message ?? 'No messages yet',
          otherPartyName: customerName,
        });
      }

      if (!mounted) return;
      setThreads(rows);
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
              <Link key={t.bookingId} href={`/pro/chat/${t.bookingId}`} className="block">
                <Card withRail>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-text">{t.otherPartyName}</div>
                      <div className="text-sm text-muted mt-0.5 truncate">{t.lastMessage}</div>
                      <div className="mt-2">
                        <StatusBadge status={t.status} />
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

