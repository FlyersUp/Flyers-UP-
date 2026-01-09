'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

/**
 * Customer Settings - Screen 12
 * Settings sections with rail + stripe
 */
export default function CustomerSettings() {
  const sections = [
    { id: 'account', label: 'ACCOUNT SETTINGS', href: '/customer/settings/account' },
    { id: 'notifications', label: 'NOTIFICATIONS', href: '/customer/settings/notifications' },
    { id: 'language', label: 'LANGUAGE', href: '/customer/settings/language' },
    { id: 'payments', label: 'PAYMENT METHODS', href: '/customer/settings/payments' },
  ];

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Settings
        </h1>

        <div className="space-y-4">
          {sections.map((section) => (
            <Link key={section.id} href={section.href}>
              <Card withRail>
                <div className="flex items-center justify-between">
                  <Label>{section.label}</Label>
                  <span className="text-gray-400">→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}












