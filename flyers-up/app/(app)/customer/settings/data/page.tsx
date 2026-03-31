'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { AccountDataExportPage } from '@/components/settings/AccountDataExportPage';

export default function CustomerAccountDataPage() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AccountDataExportPage mode="customer" />
      </div>
    </AppLayout>
  );
}
