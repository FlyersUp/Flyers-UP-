'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { SettingsHome, type SettingsHomeSection } from '@/components/settings/SettingsHome';
import { useSignOutRedirect } from '@/hooks/useSignOutRedirect';

/**
 * Customer Settings Home
 * Apple/Stripe/Linear-style grouped settings rows.
 */
export default function CustomerSettings() {
  const { signingOut, signOutError, signOut } = useSignOutRedirect();

  const sections: SettingsHomeSection[] = [
    {
      title: 'Account',
      rows: [
        { label: 'Profile', href: '/customer/settings/account-profile' },
        { label: 'Login & Security', href: '/customer/settings/privacy-security' },
        { label: 'Verification', href: '/customer/settings/safety-preferences' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { label: 'Push', href: '/customer/settings/notifications' },
        { label: 'Email', href: '/customer/settings/notifications' },
        { label: 'SMS', href: '/customer/settings/notifications' },
        { label: 'Booking, Message & Payment Preferences', href: '/customer/settings/booking-preferences' },
      ],
    },
    {
      title: 'Payments',
      rows: [
        { label: 'Payment methods', href: '/customer/settings/payment-methods' },
        { label: 'Receipts & Billing', href: '/customer/settings/payments' },
        { label: 'Refunds', href: '/customer/settings/refunds' },
      ],
    },
    {
      title: 'Location',
      rows: [{ label: 'Saved addresses', href: '/customer/settings/addresses' }],
    },
    {
      title: 'Help & Support',
      rows: [
        { label: 'How Flyers Up Works', href: '/customer/settings/app-guide' },
        { label: 'Help center', href: '/customer/settings/help-support' },
        { label: 'Report an issue', href: '/customer/settings/help-support' },
        { label: 'Contact support', href: '/customer/settings/help-support' },
      ],
    },
    {
      title: 'Legal & Trust',
      rows: [
        { label: 'Privacy, terms & support', href: '/support' },
        { label: 'Privacy policy', href: '/customer/settings/support-legal' },
        { label: 'Terms', href: '/customer/settings/support-legal' },
        { label: 'Dispute policy', href: '/customer/settings/support-legal' },
        { label: 'Verification & background checks', href: '/customer/settings/safety-preferences' },
      ],
    },
  ];

  return (
    <AppLayout mode="customer">
      <CustomerPageShell title="Settings" subtitle="Manage your account and preferences">
        <SettingsHome
          sections={sections}
          onSignOut={() => void signOut()}
          signingOut={signingOut}
          signOutError={signOutError}
        />
      </CustomerPageShell>
    </AppLayout>
  );
}












