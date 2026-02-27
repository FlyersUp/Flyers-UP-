'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import PrivacySecurityPage from '@/app/(app)/settings/privacy-security/page';

export default function ProPrivacySecurityWrapper() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PrivacySecurityPage />
      </div>
    </AppLayout>
  );
}

