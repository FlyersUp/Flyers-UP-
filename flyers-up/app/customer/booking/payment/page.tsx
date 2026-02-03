'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { createBookingWithPayment } from '@/app/actions/bookings';
import Link from 'next/link';

/**
 * Booking - Request Confirmation (request-only launch)
 * Confirm details and send a service request (no payment collected).
 */
function BookingPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const total = searchParams.get('total') || '150';
  const address = searchParams.get('address') || '';
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [editedAddress, setEditedAddress] = useState(address);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Send Request
        </h1>

        <Card className="mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-text font-semibold">SERVICE ADDRESS</Label>
              <button
                onClick={() => setShowAddressEdit(!showAddressEdit)}
                className="text-sm text-accent hover:text-text font-medium"
              >
                {showAddressEdit ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {showAddressEdit ? (
              <Input
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                placeholder="Enter full service address"
                className="bg-surface"
              />
            ) : (
              <div className="p-3 bg-surface rounded-lg border border-hairline">
                <p className="text-text font-medium">
                  {editedAddress || address || 'No address provided'}
                </p>
                <p className="text-xs text-muted/70 mt-1">
                  This is where the pro will arrive to complete the service
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Request note (no payment collected) */}
          <div>
            <Card>
              <div className="space-y-3">
                <Label className="block">HOW THIS WORKS</Label>
                <p className="text-sm text-muted">
                  You’re sending a request. The pro can accept or decline. Payment is not collected at this step.
                </p>
                <p className="text-sm text-muted">
                  Once accepted, you’ll coordinate details in Messages.
                </p>
              </div>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <Label className="mb-4 block">BOOKING SUMMARY</Label>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Service</span>
                  <span className="text-text">$120</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-semibold">
                  <span>Estimated total</span>
                  <span>${total}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-text text-sm">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button
            className="w-full"
            onClick={async () => {
              setIsProcessing(true);
              setError(null);

              try {
                const proId = searchParams.get('proId');
                const date = searchParams.get('date');
                const time = searchParams.get('time');
                const addonIds = searchParams.get('addonIds') || '';
                const finalAddress = editedAddress || address;

                if (!proId || !date || !time) {
                  setError('Missing booking information. Please go back and try again.');
                  setIsProcessing(false);
                  return;
                }

                if (!finalAddress || finalAddress.trim() === '') {
                  setError('Please provide a service address.');
                  setIsProcessing(false);
                  return;
                }

                // Create booking with add-ons and payment intent
                const result = await createBookingWithPayment(
                  proId,
                  date,
                  time,
                  finalAddress,
                  '',
                  addonIds ? addonIds.split(',') : []
                );

                if (!result.success) {
                  setError(result.error || 'Failed to create booking. Please try again.');
                  setIsProcessing(false);
                  return;
                }

                // Redirect to success page
                router.push(`/customer/booking/success?bookingId=${result.bookingId}&addonIds=${addonIds}`);
              } catch (err) {
                console.error('Error processing payment:', err);
                setError('An unexpected error occurred. Please try again.');
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing}
          >
            {isProcessing ? 'Sending…' : 'Send request →'}
          </Button>
          <div className="mt-3 text-xs text-muted/70 leading-relaxed">
            By booking, you agree to the Flyers Up{' '}
            <Link href="/terms" className="underline hover:text-text">
              Terms of Service
            </Link>
            .
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function BookingPayment() {
  return (
    <Suspense fallback={
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted/70">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <BookingPaymentContent />
    </Suspense>
  );
}

