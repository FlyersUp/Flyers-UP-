'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBookingById, type BookingDetails } from '@/lib/api';

function PayContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const b = await getBookingById(bookingId);
      if (!mounted) return;
      setBooking(b);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pay for completed work</h1>
          <p className="text-muted mt-1">
            Payment is collected after the pro finishes. You’ll only be able to pay when this request is marked “awaiting payment”.
          </p>
        </div>

        {error ? (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>
        ) : null}

        {loading ? (
          <Card withRail>
            <p className="text-sm text-muted/70">Loading…</p>
          </Card>
        ) : !bookingId ? (
          <Card withRail className="border-l-[3px] border-l-accent">
            <div className="space-y-2">
              <div className="font-semibold text-text">Missing booking</div>
              <p className="text-sm text-muted">Expected `?bookingId=` in the URL.</p>
            </div>
          </Card>
        ) : !booking ? (
          <Card withRail className="border-l-[3px] border-l-accent">
            <div className="space-y-2">
              <div className="font-semibold text-text">Booking not found</div>
              <p className="text-sm text-muted">This request may have been removed.</p>
              <Link href="/customer" className="text-sm text-accent hover:underline">
                Back to dashboard →
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <Card withRail>
              <Label>SUMMARY</Label>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <span className="text-text font-medium">{booking.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date</span>
                  <span className="text-text font-medium">{booking.serviceDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Time</span>
                  <span className="text-text font-medium">{booking.serviceTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total</span>
                  <span className="text-text font-semibold">{booking.price != null ? `$${booking.price}` : 'TBD'}</span>
                </div>
                <p className="text-xs text-muted/70 pt-2 border-t border-border mt-3">
                  15% platform fee. Includes secure payment processing, fraud protection, and platform operations.
                </p>
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={paying || booking.status !== 'awaiting_payment' || booking.price == null}
                onClick={async () => {
                  setPaying(true);
                  setError(null);
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ bookingId }),
                    });
                    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                    if (!res.ok || !json.url) {
                      setError(json.error || 'Could not start checkout.');
                      setPaying(false);
                      return;
                    }
                    window.location.href = json.url;
                  } catch (e) {
                    setError('Could not start checkout. Please try again.');
                    setPaying(false);
                  }
                }}
                showArrow={false}
              >
                {paying ? 'Starting checkout…' : 'Continue to payment'}
              </Button>
              <Link
                href={`/jobs/${encodeURIComponent(bookingId)}`}
                className="inline-flex items-center px-4 py-2 rounded-xl border border-border bg-surface2 hover:bg-surface transition-colors text-text font-medium"
              >
                Back to request
              </Link>
            </div>

            {booking.status !== 'awaiting_payment' ? (
              <p className="text-xs text-muted/70">
                This request isn’t ready for payment right now.
              </p>
            ) : null}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-4xl mx-auto px-4 py-10">
            <p className="text-muted/70 text-center">Loading…</p>
          </div>
        </AppLayout>
      }
    >
      <PayContent />
    </Suspense>
  );
}

