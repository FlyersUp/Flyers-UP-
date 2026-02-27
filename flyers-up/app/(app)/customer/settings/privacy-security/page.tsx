'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import PrivacySecurityPage from '@/app/(app)/settings/privacy-security/page';

export default function CustomerPrivacySecurityWrapper() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PrivacySecurityPage />
      </div>
    </AppLayout>
  );
}

