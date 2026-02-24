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
  lastAt: string | null;
  otherPartyName: string;
};

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

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, service_date, service_time, created_at, service_pros(display_name)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      const b = (bookings || []) as Array<{
        id: string;
        status: string;
        service_date: string;
        service_time: string;
        created_at: string;
        service_pros?: { display_name: string | null } | { display_name: string | null }[] | null;
      }>;

      const rows: ThreadRow[] = [];
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
        const proName = pro?.display_name?.trim() || 'Pro';
        rows.push({
          bookingId: booking.id,
          status: booking.status,
          date: booking.service_date,
          time: booking.service_time,
          lastMessage: lastRow?.message ?? 'No messages yet',
          lastAt: lastRow?.created_at ?? null,
          otherPartyName: proName,
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
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Label className="mb-2 block">Messages</Label>
          <h1 className="text-2xl font-semibold text-text">Messages</h1>
          <p className="text-muted mt-1">Your conversations with pros will show up here.</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted/70">Loading…</p>
        ) : (
          <div className="space-y-4">
            {threads.map((t) => (
              <Link key={t.bookingId} href={`/customer/chat/${t.bookingId}`} className="block">
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
                <div className="text-sm text-muted mt-1">When you send a request, your thread will appear here.</div>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

