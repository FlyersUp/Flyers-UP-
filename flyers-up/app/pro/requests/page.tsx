'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabaseClient';
import { updateBookingStatus } from '@/lib/api';

type Row = {
  id: string;
  service_date: string;
  service_time: string;
  address: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export default function ProRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth?next=%2Fpro%2Frequests');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!profile || profile.role !== 'pro') {
        router.replace('/onboarding/role?next=%2Fpro%2Frequests');
        return;
      }

      const { data, error: qErr } = await supabase
        .from('bookings')
        .select('id, service_date, service_time, address, notes, status, created_at')
        .eq('status', 'requested')
        .order('created_at', { ascending: false });

      if (qErr) {
        setError(qErr.message);
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((data as Row[]) || []);
      setLoading(false);
    };
    void run();
  }, [router]);

  const empty = !loading && rows.length === 0;

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Label className="mb-2 block">PRO REQUESTS</Label>
          <h1 className="text-2xl font-semibold text-text">Requests</h1>
          <p className="text-muted mt-1">Incoming requests that need your response.</p>
        </div>

        {error && (
          <div className="mb-4 bg-danger/10 text-text px-4 py-3 rounded-lg text-sm border border-danger/30">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted/70">Loading…</p>
        ) : empty ? (
          <Card className="p-5">
            <div className="text-sm font-semibold text-text">No new requests</div>
            <div className="text-sm text-muted mt-1">When a customer sends a request, it will appear here.</div>
          </Card>
        ) : (
          <div className="flex flex-col gap-[14px] overflow-visible">
            {rows.map((r) => (
              <Card key={r.id} className="border-l-[3px] border-l-accent">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-text truncate">Service request</div>
                    <div className="text-sm text-muted mt-0.5">
                      {new Date(r.service_date).toLocaleDateString()} • {r.service_time}
                    </div>
                    <div className="text-sm text-muted mt-1 line-clamp-2">{r.address}</div>
                    {r.notes ? <div className="text-sm text-muted mt-1 line-clamp-2">Notes: {r.notes}</div> : null}
                    <div className="mt-2">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-[11rem] shrink-0">
                    <Button
                      showArrow={false}
                      disabled={actingId === r.id}
                      onClick={async () => {
                        setActingId(r.id);
                        setError(null);
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          router.replace('/auth?next=%2Fpro%2Frequests');
                          return;
                        }
                        const res = await updateBookingStatus({
                          bookingId: r.id,
                          newStatus: 'accepted',
                          proUserId: user.id,
                        });
                        if (typeof res !== 'boolean' && !res.success) {
                          setError(res.error || 'Failed to accept.');
                        } else {
                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                        }
                        setActingId(null);
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      showArrow={false}
                      disabled={actingId === r.id}
                      onClick={async () => {
                        setActingId(r.id);
                        setError(null);
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          router.replace('/auth?next=%2Fpro%2Frequests');
                          return;
                        }
                        const res = await updateBookingStatus({
                          bookingId: r.id,
                          newStatus: 'declined',
                          proUserId: user.id,
                        });
                        if (typeof res !== 'boolean' && !res.success) {
                          setError(res.error || 'Failed to decline.');
                        } else {
                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                        }
                        setActingId(null);
                      }}
                    >
                      Decline
                    </Button>
                    <Link href={`/pro/chat/${r.id}`} className="block">
                      <Button variant="ghost" showArrow={false} className="w-full">
                        Message
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

