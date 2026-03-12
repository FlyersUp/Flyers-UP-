'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { TrustRow } from '@/components/ui/TrustRow';
import Link from 'next/link';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Customer Settings - Screen 12
 * Settings sections with rail + stripe
 */
export default function CustomerSettings() {
  const t = useTranslations('settings');
  const sections = [
    { id: 'account-profile', labelKey: 'accountProfile', href: '/customer/settings/account-profile', icon: 'user' as const },
    { id: 'addresses', labelKey: 'addresses', href: '/customer/settings/addresses', icon: 'map-pin' as const },
    { id: 'payment-methods', labelKey: 'paymentMethods', href: '/customer/settings/payment-methods', icon: 'credit-card' as const },
    { id: 'booking-preferences', labelKey: 'bookingPreferences', href: '/customer/settings/booking-preferences', icon: 'calendar' as const },
    { id: 'ratings-reviews', labelKey: 'ratingsReviews', href: '/customer/settings/ratings-reviews', icon: 'star' as const },
    { id: 'notifications', labelKey: 'notifications', href: '/customer/settings/notifications', icon: 'bell' as const },
    { id: 'safety-preferences', labelKey: 'safetyPreferences', href: '/customer/settings/safety-preferences', icon: 'safety-check' as const },
    { id: 'app-preferences', labelKey: 'appPreferences', href: '/customer/settings/app-preferences', icon: 'settings' as const },
    { id: 'support-legal', labelKey: 'supportLegal', href: '/customer/settings/support-legal', icon: 'file-text' as const },
  ];

  return (
    <AppLayout mode="customer">
      <CustomerPageShell
        title={t('title')}
        subtitle={t('customerSubtitle')}
      >
        <div className="max-w-4xl mx-auto px-4 pt-2">
          <div className="mb-6">
            <TrustRow />
          </div>

          {/* Language section - first */}
          <Card withRail className="mb-3">
            <Label variant="card" className="mb-3">
              <span className="inline-flex items-center gap-2">
                <AppIcon name="globe" size={18} className="text-gray-600 dark:text-gray-300" alt="" />
                <span className="text-gray-900 dark:text-white font-medium">{t('language')}</span>
              </span>
            </Label>
            <LanguageSwitcher variant="list" />
          </Card>

          <div className="flex flex-col gap-3">
            {sections.map((section) => (
              <Link key={section.id} href={section.href} className="block">
                <Card withRail>
                  <div className="flex items-center justify-between">
                    <Label variant="card">
                      <span className="inline-flex items-center gap-2">
                        <AppIcon name={section.icon as AppIconName} size={18} className="text-gray-600 dark:text-gray-300" alt="" />
                        <span className="text-gray-900 dark:text-white font-medium">{t(section.labelKey)}</span>
                      </span>
                    </Label>
                    <span className="text-gray-500 dark:text-gray-400">→</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </CustomerPageShell>
    </AppLayout>
  );
}












