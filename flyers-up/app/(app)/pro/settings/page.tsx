'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { SettingsHome, type SettingsHomeSection } from '@/components/settings/SettingsHome';
import { useSignOutRedirect } from '@/hooks/useSignOutRedirect';

export default function ProSettingsIndex() {
  const { signingOut, signOutError, signOut } = useSignOutRedirect('/auth');

  const sections: SettingsHomeSection[] = [
    {
      title: 'Account',
      rows: [
        { label: 'Business profile', href: '/pro/settings/business-profile' },
        { label: 'Login & Security', href: '/pro/settings/account-identity' },
        { label: 'Verification', href: '/pro/settings/safety-compliance' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { label: 'Push', href: '/pro/settings/notifications' },
        { label: 'Email', href: '/pro/settings/notifications' },
        { label: 'SMS', href: '/pro/settings/notifications' },
        { label: 'Booking, Message & Payment Preferences', href: '/pro/settings/preferences' },
      ],
    },
    {
      title: 'Payments',
      rows: [
        { label: 'Payout settings', href: '/pro/settings/payments-payouts' },
        { label: 'Receipts / Billing', href: '/pro/earnings' },
      ],
    },
    {
      title: 'Location',
      rows: [
        { label: 'Service area / Travel radius', href: '/pro/settings/business-profile' },
        { label: 'Pricing & Availability', href: '/pro/settings/pricing-availability' },
      ],
    },
    {
      title: 'Help & Support',
      rows: [
        { label: 'How Flyers Up Works', href: '/pro/settings/app-guide' },
        { label: 'Help center', href: '/pro/settings/help-support' },
        { label: 'Report an issue', href: '/pro/settings/help-support' },
        { label: 'Contact support', href: '/pro/settings/help-support' },
      ],
    },
    {
      title: 'Legal & Trust',
      rows: [
        { label: 'Privacy policy', href: '/pro/settings/support-legal' },
        { label: 'Terms', href: '/pro/settings/support-legal' },
        { label: 'Dispute policy', href: '/pro/settings/support-legal' },
        { label: 'Verification & background checks', href: '/pro/verified-badge' },
      ],
    },
  ];

  return (
    <AppLayout mode="pro">
      <ProPageShell title="Settings" subtitle="Manage your account, operations, and trust controls">
        <SettingsHome
          sections={sections}
          onSignOut={() => void signOut()}
          signingOut={signingOut}
          signOutError={signOutError}
        />
      </ProPageShell>
    </AppLayout>
  );
}

