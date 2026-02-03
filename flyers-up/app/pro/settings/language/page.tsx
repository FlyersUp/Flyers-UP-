'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import LanguageSettingsPage from '@/app/settings/language/page';

export default function ProLanguageSettingsWrapper() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <LanguageSettingsPage />
      </div>
    </AppLayout>
  );
}

