'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { TrustRow } from '@/components/ui/TrustRow';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

export default function ProSettingsIndex() {
  const sections = [
    { id: 'account-identity', label: 'ACCOUNT & IDENTITY', href: '/pro/settings/account-identity', icon: 'id-card' as const },
    { id: 'business-profile', label: 'BUSINESS PROFILE', href: '/pro/settings/business-profile', icon: 'building' as const },
    { id: 'pricing-availability', label: 'PRICING & AVAILABILITY', href: '/pro/settings/pricing-availability', icon: 'calendar' as const },
    { id: 'payments-payouts', label: 'PAYMENTS & PAYOUTS', href: '/pro/settings/payments-payouts', icon: 'credit-card' as const },
    { id: 'notifications', label: 'NOTIFICATIONS', href: '/pro/settings/notifications', icon: 'bell' as const },
    { id: 'preferences', label: 'APP PREFERENCES', href: '/pro/settings/preferences', icon: 'settings' as const },
    { id: 'safety-compliance', label: 'SAFETY & COMPLIANCE', href: '/pro/settings/safety-compliance', icon: 'shield-check' as const },
    { id: 'support-legal', label: 'SUPPORT & LEGAL', href: '/pro/settings/support-legal', icon: 'file-text' as const },
  ];

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        <h1 className="text-2xl font-semibold text-text mb-2">Settings</h1>
        <p className="text-muted mb-6">Manage your pro account, business, payouts, and preferences.</p>
        <div className="mb-6">
          <TrustRow />
        </div>

        <div className="flex flex-col gap-[14px] overflow-visible">
          {sections.map((section) => (
            <Link key={section.id} href={section.href} className="block">
              <Card withRail>
                <div className="flex items-center justify-between">
                  <Label>
                    <span className="inline-flex items-center gap-2">
                      <AppIcon name={section.icon as AppIconName} size={18} className="text-muted" alt="" />
                      <span>{section.label}</span>
                    </span>
                  </Label>
                  <span className="text-muted/70">→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

