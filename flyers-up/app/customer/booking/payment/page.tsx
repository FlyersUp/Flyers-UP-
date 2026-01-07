'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { createBookingWithPayment } from '@/app/actions/bookings';

/**
 * Booking - Payment - Screen 8
 * Payment form with summary
 */
function BookingPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const total = searchParams.get('total') || '150';
  const address = searchParams.get('address') || '';
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [editedAddress, setEditedAddress] = useState(address);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Payment
        </h1>

        {/* Service Address Section - Prominent for Pros */}
        <Card className="mb-6 bg-emerald-50 border-emerald-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-900 font-semibold">📍 SERVICE ADDRESS</Label>
              <button
                onClick={() => setShowAddressEdit(!showAddressEdit)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {showAddressEdit ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {showAddressEdit ? (
              <Input
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                placeholder="Enter full service address"
                className="bg-white"
              />
            ) : (
              <div className="p-3 bg-white rounded-lg border border-emerald-200">
                <p className="text-gray-900 font-medium">
                  {editedAddress || address || 'No address provided'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This is where the pro will arrive to complete the service
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment Form */}
          <div>
            <Card>
              <div className="space-y-4">
                <Input
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                  <Input
                    label="CVV"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveCard"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="saveCard" className="text-sm text-gray-700">
                    Save payment method
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <Label className="mb-4 block">BOOKING SUMMARY</Label>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service</span>
                  <span className="text-gray-900">$120</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform Fee</span>
                  <span className="text-gray-900">$30</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button
            className="w-full"
            onClick={async () => {
              if (!cardNumber || !expiry || !cvv) return;

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
            disabled={!cardNumber || !expiry || !cvv || isProcessing}
          >
            {isProcessing ? 'Processing...' : `Pay ${total} →`}
          </Button>
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
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <BookingPaymentContent />
    </Suspense>
  );
}

