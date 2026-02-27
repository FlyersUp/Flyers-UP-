'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import BusinessSettingsPage from '@/app/(app)/settings/business/page';

export default function ProBusinessSettingsPage() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <BusinessSettingsPage />
      </div>
    </AppLayout>
  );
}

