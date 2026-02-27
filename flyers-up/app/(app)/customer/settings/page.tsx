'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { TrustRow } from '@/components/ui/TrustRow';
import Link from 'next/link';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

/**
 * Customer Settings - Screen 12
 * Settings sections with rail + stripe
 */
export default function CustomerSettings() {
  const sections = [
    { id: 'account-profile', label: 'Account & profile', href: '/customer/settings/account-profile', icon: 'user' as const },
    { id: 'addresses', label: 'Addresses', href: '/customer/settings/addresses', icon: 'map-pin' as const },
    { id: 'payment-methods', label: 'Payment methods', href: '/customer/settings/payment-methods', icon: 'credit-card' as const },
    { id: 'booking-preferences', label: 'Booking preferences', href: '/customer/settings/booking-preferences', icon: 'calendar' as const },
    { id: 'ratings-reviews', label: 'Ratings & reviews', href: '/customer/settings/ratings-reviews', icon: 'star' as const },
    { id: 'notifications', label: 'Notifications', href: '/customer/settings/notifications', icon: 'bell' as const },
    { id: 'safety-preferences', label: 'Safety & preferences', href: '/customer/settings/safety-preferences', icon: 'safety-check' as const },
    { id: 'app-preferences', label: 'App preferences', href: '/customer/settings/app-preferences', icon: 'settings' as const },
    { id: 'support-legal', label: 'Support & legal', href: '/customer/settings/support-legal', icon: 'file-text' as const },
  ];

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Settings
        </h1>
        <div className="mb-6">
          <TrustRow />
        </div>

        <div className="flex flex-col gap-[14px] overflow-visible">
          {sections.map((section) => (
            <Link key={section.id} href={section.href} className="block">
              <Card withRail>
                <div className="flex items-center justify-between">
                  <Label variant="card">
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












