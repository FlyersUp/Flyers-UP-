'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import PaymentSettingsPage from '@/app/(app)/settings/payments/page';

export default function ProPaymentSettingsWrapper() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PaymentSettingsPage />
      </div>
    </AppLayout>
  );
}

