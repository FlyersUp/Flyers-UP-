import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';

export default function BookingNotFound() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-6">
          <p className="text-sm text-muted">Booking not found</p>
          <Link
            href="/customer/bookings"
            className="mt-4 inline-block text-sm font-medium text-text hover:underline"
          >
            ← Back to bookings
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
