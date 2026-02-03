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
  const credentials = [
    { id: '1', name: 'Business License', status: 'verified', date: 'Jan 1, 2024' },
    { id: '2', name: 'Insurance Certificate', status: 'verified', date: 'Jan 1, 2024' },
    { id: '3', name: 'Background Check', status: 'pending', date: 'Jan 10, 2024' },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'verified') {
      return <OfficialBadge>VERIFIED</OfficialBadge>;
    }
    return <OfficialBadge>PENDING REVIEW</OfficialBadge>;
  };

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text mb-6">
          Credentials
        </h1>

        <div className="space-y-4 mb-6">
          {credentials.map((cred) => (
            <Card withRail={false} key={cred.id} className="border-l-[3px] border-l-accent">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-text mb-1">{cred.name}</div>
                  <div className="text-sm text-muted">Uploaded {cred.date}</div>
                </div>
                {getStatusBadge(cred.status)}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Button variant="secondary" className="w-full">
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

