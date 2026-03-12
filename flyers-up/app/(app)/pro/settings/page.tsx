'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { TrustRow } from '@/components/ui/TrustRow';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ProSettingsIndex() {
  const t = useTranslations('settings');
  const sections = [
    { id: 'account-identity', labelKey: 'accountIdentity', href: '/pro/settings/account-identity', icon: 'id-card' as const },
    { id: 'business-profile', labelKey: 'businessProfile', href: '/pro/settings/business-profile', icon: 'building' as const },
    { id: 'pricing-availability', labelKey: 'pricingAvailability', href: '/pro/settings/pricing-availability', icon: 'calendar' as const },
    { id: 'payments-payouts', labelKey: 'paymentsPayouts', href: '/pro/settings/payments-payouts', icon: 'credit-card' as const },
    { id: 'notifications', labelKey: 'notifications', href: '/pro/settings/notifications', icon: 'bell' as const },
    { id: 'preferences', labelKey: 'preferences', href: '/pro/settings/preferences', icon: 'settings' as const },
    { id: 'safety-compliance', labelKey: 'trustSafety', href: '/pro/settings/safety-compliance', icon: 'safety-check' as const },
    { id: 'support-legal', labelKey: 'supportLegal', href: '/pro/settings/support-legal', icon: 'file-text' as const },
  ];

  return (
    <AppLayout mode="pro">
      <ProPageShell
        title={t('title')}
        subtitle={t('proSubtitle')}
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
      </ProPageShell>
    </AppLayout>
  );
}

