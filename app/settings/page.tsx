'use client';

/**
 * Settings Home Page
 * Displays a list of links to all settings sections
 */

import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface SettingsLink {
  href: string;
  label: string;
  description: string;
  icon: string;
  proOnly?: boolean;
}

const SETTINGS_SECTIONS: SettingsLink[] = [
  {
    href: '/settings/account',
    label: 'Account',
    description: 'Update your name, email, and phone number',
    icon: '👤',
  },
  {
    href: '/settings/language',
    label: 'Language',
    description: 'Choose your preferred language',
    icon: '🌐',
  },
  {
    href: '/settings/business',
    label: 'My Business',
    description: 'Manage your business profile and service details',
    icon: '🏢',
    proOnly: true,
  },
  {
    href: '/settings/notifications',
    label: 'Notifications',
    description: 'Control how and when you receive notifications',
    icon: '🔔',
  },
  {
    href: '/settings/privacy-security',
    label: 'Privacy & Security',
    description: 'Manage password, 2FA, and account security',
    icon: '🔒',
  },
  {
    href: '/settings/payments',
    label: 'Payments',
    description: 'Manage payment methods and payout settings',
    icon: '💳',
  },
  {
    href: '/settings/help-support',
    label: 'Help & Support',
    description: 'FAQs, contact support, and terms',
    icon: '🆘',
  },
];

export default function SettingsPage() {
  const { user } = useCurrentUser();

  const visibleSections = SETTINGS_SECTIONS.filter((section) => !(section.proOnly && user?.role !== 'pro'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{section.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{section.label}</h3>
                <p className="text-sm text-gray-600">{section.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}



