'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

/**
 * Verified Credentials Upload - Screen 19
 * Document upload UI with status badges
 */
export default function Credentials() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text mb-6">
          Credentials
        </h1>

        <div className="space-y-4 mb-6">
          <Card withRail={false} className="border-l-[3px] border-l-accent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-text mb-1">No documents uploaded yet</div>
                <div className="text-sm text-muted">
                  This used to show demo verification data. When credential uploads are enabled, your real status will appear here.
                </div>
              </div>
              <OfficialBadge>COMING SOON</OfficialBadge>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Button variant="secondary" className="w-full" disabled>
            ADD DOCUMENT →
          </Button>
          <Link href="/pro/verified-badge" className="block">
            <Button variant="primary" className="w-full">
              EXPORT VERIFIED BADGE →
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

