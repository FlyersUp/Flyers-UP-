'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import JobTimelineCard from '@/components/jobs/JobTimelineCard';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { JobNextAction } from '@/components/jobs/JobNextAction';
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import { normalizeUuidOrNull } from '@/lib/isUuid';

/**
 * Active Job Screen - Screen 17
 * Job details with action buttons
 */
export default function ActiveJob({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!mounted) return;
      setSignedIn(Boolean(user));
      if (!user) {
        setBooking(null);
        setLoading(false);
        return;
      }

      const id = normalizeUuidOrNull(jobId);
      if (!id) {
        setBooking(null);
        setLoading(false);
        return;
      }

      const b = await getBookingById(id);
      if (!mounted) return;
      setBooking(b);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const formattedDate = useMemo(() => {
    if (!booking) return null;
    const d = new Date(booking.serviceDate);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [booking]);

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Job Details
        </h1>

        {loading ? (
          <Card withRail className="mb-6">
            <p className="text-sm text-muted/70">Loading…</p>
          </Card>
        ) : !signedIn ? (
          <Card withRail className="mb-6">
            <p className="text-sm text-muted/70">Please sign in to view job details.</p>
            <div className="mt-4">
              <Link
                href={`/signin?next=${encodeURIComponent(`/pro/jobs/${jobId}`)}`}
                className="text-sm font-medium text-text hover:underline"
              >
                Sign in →
              </Link>
            </div>
          </Card>
        ) : !booking ? (
          <Card withRail className="mb-6 border-l-[3px] border-l-accent">
            <div className="space-y-2">
              <div className="font-semibold text-text">No job details yet</div>
              <p className="text-sm text-muted">
                This screen used to show demo data. Real jobs will appear here once you accept a request.
              </p>
            </div>
          </Card>
        ) : (
          <Card withRail className="mb-6">
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">CUSTOMER</Label>
                <div className="text-sm text-muted/80">
                  Customer ID: <span className="font-mono text-text">{booking.customerId.slice(0, 8)}…</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">ADDRESS</Label>
                <p className="text-text">{booking.address || '—'}</p>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="mb-2 block">TIME</Label>
                <p className="text-text">
                  {formattedDate || '—'} {booking.serviceTime ? `at ${booking.serviceTime}` : ''}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="mb-2 block">CUSTOMER NOTES</Label>
                <p className="text-text">{booking.notes || '—'}</p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-surface2 border-l-[3px] border-l-accent">
                <div className="flex justify-between items-center">
                  <Label>TOTAL</Label>
                  <div className="text-2xl font-bold text-text">{booking.price != null ? `$${booking.price}` : 'TBD'}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {booking && (
          <div className="mb-6 rounded-2xl border border-black/10 shadow-sm overflow-hidden bg-[hsl(var(--surface))]">
            <JobTimelineCard
              status={mapDbStatusToTimeline(booking.status)}
              timestamps={buildTimestampsFromBooking(
                booking.createdAt,
                booking.statusHistory,
                {
                  acceptedAt: booking.acceptedAt,
                  onTheWayAt: booking.onTheWayAt,
                  startedAt: booking.startedAt,
                  completedAt: booking.completedAt,
                }
              )}
              className="rounded-t-2xl border-0 shadow-none mb-0"
            />

            <JobNextAction
              booking={booking}
              onUpdated={setBooking}
              jobId={jobId}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}












