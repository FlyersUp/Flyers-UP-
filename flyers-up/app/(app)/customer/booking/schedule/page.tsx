'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';

/**
 * Booking - Select Date & Time - Screen 6
 * Calendar/date picker and time slots
 */
function BookingScheduleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proId = searchParams.get('proId');
  const serviceId = searchParams.get('serviceId');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  ];

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Choose a date &amp; time
        </h1>
        <p className="text-sm text-muted/70 mb-6">
          Pick a time that works for you. You’ll review everything before you send the request.
        </p>

        <div className="space-y-6 mb-8">
          <div>
            <Label className="mb-3 block">SELECT DATE</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-3 block">SELECT TIME</Label>
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedTime === time
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-16 left-0 right-0 bg-surface border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            <Button
              className="w-full"
              onClick={() => router.push(`/customer/booking/review?proId=${proId}&serviceId=${serviceId}&date=${selectedDate}&time=${selectedTime}`)}
              disabled={!selectedDate || !selectedTime}
            >
              Review details →
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function BookingSchedule() {
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
      <BookingScheduleContent />
    </Suspense>
  );
}

