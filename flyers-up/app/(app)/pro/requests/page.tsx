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

type Row = {
  id: string;
  customer_id: string;
  customer?: { fullName: string | null; phone: string | null } | null;
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
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          router.replace('/auth?next=%2Fpro%2Frequests');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (!mounted) return;
        if (!profile || profile.role !== 'pro') {
          router.replace('/onboarding/role?next=%2Fpro%2Frequests');
          return;
        }

        const res = await fetch('/api/pro/bookings?status=requested&limit=50', { cache: 'no-store' });
        if (!mounted) return;
        if (!res.ok) {
          setError('Failed to load requests.');
          setRows([]);
          return;
        }
        const json = (await res.json()) as { ok: boolean; bookings?: Row[]; error?: string };
        if (!mounted) return;
        if (!json.ok) {
          setError(json.error || 'Failed to load requests.');
          setRows([]);
          return;
        }
        setRows(json.bookings || []);
      } catch (e) {
        if (mounted) {
          setError('Failed to load requests.');
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
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
                      Customer:{' '}
                      {r.customer?.fullName ? (
                        <span className="text-text font-medium">{r.customer.fullName}</span>
                      ) : (
                        <span className="font-mono">{r.customer_id.slice(0, 8)}…</span>
                      )}
                    </div>
                    {r.customer?.phone ? (
                      <div className="text-sm text-muted mt-0.5">Phone: {r.customer.phone}</div>
                    ) : null}
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
                    <Link href={`/pro/jobs/${r.id}`} className="block">
                      <Button variant="secondary" showArrow={false} className="w-full">
                        View details
                      </Button>
                    </Link>
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
                          router.push(`/pro/jobs/${r.id}`);
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
                        const res = await fetch(`/api/bookings/${r.id}/decline`, { method: 'POST' });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setError(json.error || 'Failed to decline.');
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

