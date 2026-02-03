'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import HelpSupportPage from '@/app/settings/help-support/page';

export default function ProHelpSupportWrapper() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <HelpSupportPage />
      </div>
    </AppLayout>
  );
}

