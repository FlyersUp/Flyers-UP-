'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import AccountSettingsPage from '@/app/settings/account/page';

export default function ProAccountSettingsPage() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AccountSettingsPage />
      </div>
    </AppLayout>
  );
}

