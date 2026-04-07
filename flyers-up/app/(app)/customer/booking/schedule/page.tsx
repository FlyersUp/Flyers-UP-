'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { bottomChrome } from '@/lib/layout/bottomChrome';

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
      <div className={`mx-auto max-w-4xl bg-[#F5F6F8] px-4 py-6 ${bottomChrome.pbStickyBarOnly}`}>
        <h1 className="mb-2 text-[1.625rem] font-bold leading-tight tracking-tight text-[#2d3436] dark:text-white">
          Choose a date &amp; time
        </h1>
        <p className="mb-6 text-[15px] text-[#6B7280] dark:text-white/60">
          Pick a time that works for you. You’ll review everything before you send the request.
        </p>

        <div className="mb-8 space-y-6">
          <div className="rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
            <Label className="mb-3 block text-sm font-semibold text-[#2d3436] dark:text-white">SELECT DATE</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border-[#E5E7EB] bg-white dark:border-white/12 dark:bg-[#14161c]"
            />
          </div>

          <div className="rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
            <Label className="mb-3 block text-sm font-semibold text-[#2d3436] dark:text-white">SELECT TIME</Label>
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-200 active:scale-[0.98] ${
                    selectedTime === time
                      ? 'border-[#4A69BD] bg-[#4A69BD] text-white shadow-[0_4px_14px_rgba(74,105,189,0.28)]'
                      : 'border-[#E5E7EB] bg-white text-[#2d3436] hover:border-[#4A69BD]/35 dark:border-white/12 dark:bg-[#14161c] dark:text-white'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`fixed left-0 right-0 z-40 border-t border-[#E8EAED] bg-[#F5F6F8]/95 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-[#0d0d0f]/95 ${bottomChrome.fixedAboveNav}`}
        >
          <div className="mx-auto max-w-4xl">
            <Button
              showArrow={false}
              className="!h-12 !min-h-12 !w-full !rounded-full !border-[#E89540] !bg-[#FFB347] !px-6 !font-bold !text-[#2d3436] !shadow-[0_6px_22px_rgba(255,179,71,0.45)] hover:!brightness-[1.02] active:!scale-[0.98] dark:!text-[#1a1a1a]"
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

