import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingLoadErrorPage } from '@/components/checkout/BookingLoadErrorPage';

export default function BookingNotFound() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center min-h-[60vh]">
        <BookingLoadErrorPage
          title="Couldn't find this booking"
          errorStatus={404}
          primaryHref="/customer/bookings"
          primaryLabel="View all bookings"
          secondaryHref="/customer/categories"
          secondaryLabel="Find a pro"
          compact={false}
        />
      </div>
    </AppLayout>
  );
}
