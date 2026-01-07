'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getConversationId } from '@/lib/mockData';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Booking Confirmation / Success
 * Uses mock booking details, but does NOT fabricate an authenticated user.
 */
function BookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = searchParams.get('proId') || '1';
  const { user } = useCurrentUser();
  const [conversationId, setConversationId] = useState<string>('');

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      setConversationId('');
      return;
    }
    setConversationId(getConversationId(user.id, proId));
  }, [proId, user]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="text-center py-12">
          <div className="text-6xl mb-6">✓</div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">Your booking is confirmed!</h1>
          <p className="text-gray-600 mb-8">
            You&apos;ll receive a confirmation email shortly with all the details.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium">Deep Clean</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">Jan 15, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">10:00 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">$150</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" onClick={() => router.push('/dashboard/customer')}>
              VIEW BOOKING →
            </Button>
            {user ? (
              <Button onClick={() => router.push(conversationId ? `/messages/${conversationId}` : '/messages')}>
                MESSAGE PRO →
              </Button>
            ) : (
              <Button onClick={() => router.push('/signin?role=customer')}>SIGN IN TO MESSAGE →</Button>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function BookingSuccess() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          </div>
        </AppLayout>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}



