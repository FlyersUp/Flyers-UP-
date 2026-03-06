'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { TrustRow } from '@/components/ui/TrustRow';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

export default function ProSettingsIndex() {
  const sections = [
    { id: 'account-identity', label: 'Account & identity', href: '/pro/settings/account-identity', icon: 'id-card' as const },
    { id: 'business-profile', label: 'Business profile', href: '/pro/settings/business-profile', icon: 'building' as const },
    { id: 'pricing-availability', label: 'Pricing & availability', href: '/pro/settings/pricing-availability', icon: 'calendar' as const },
    { id: 'payments-payouts', label: 'Payments & payouts', href: '/pro/settings/payments-payouts', icon: 'credit-card' as const },
    { id: 'notifications', label: 'Notifications', href: '/pro/settings/notifications', icon: 'bell' as const },
    { id: 'preferences', label: 'App preferences', href: '/pro/settings/preferences', icon: 'settings' as const },
    { id: 'safety-compliance', label: 'Trust & Safety', href: '/pro/settings/safety-compliance', icon: 'safety-check' as const },
    { id: 'support-legal', label: 'Support & legal', href: '/pro/settings/support-legal', icon: 'file-text' as const },
  ];

  return (
    <AppLayout mode="pro">
      <ProPageShell
        title="Settings"
        subtitle="Manage your pro account, business, payouts, and preferences."
      >
        <div className="max-w-4xl mx-auto px-4 pt-2">
          <div className="mb-6">
            <TrustRow />
          </div>

          <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <Link key={section.id} href={section.href} className="block">
                  <Card withRail>
                    <div className="flex items-center justify-between">
                      <Label variant="card">
                        <span className="inline-flex items-center gap-2">
                          <AppIcon name={section.icon as AppIconName} size={18} className="text-[#6B7280]" alt="" />
                          <span className="text-[#111]">{section.label}</span>
                        </span>
                      </Label>
                      <span className="text-[#6B7280]">→</span>
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

