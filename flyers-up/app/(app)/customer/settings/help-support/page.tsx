'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import HelpSupportPage from '@/app/(app)/settings/help-support/page';

export default function CustomerHelpSupportWrapper() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <HelpSupportPage />
      </div>
    </AppLayout>
  );
}

