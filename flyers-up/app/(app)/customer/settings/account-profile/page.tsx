'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import AccountSettingsPage from '@/app/(app)/settings/account/page';
import { TrustRow } from '@/components/ui/TrustRow';

export default function CustomerAccountProfilePage() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Account &amp; Profile</h1>
          <p className="text-muted mt-1">Who you are and how you log in.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <Card withRail>
          <Label>PROFILE</Label>
          <p className="mt-4 text-sm text-muted">Edit your info and login settings.</p>
        </Card>

        {/* Reuse the current account settings form while we expand the customer profile fields */}
        <AccountSettingsPage />
      </div>
    </AppLayout>
  );
}

