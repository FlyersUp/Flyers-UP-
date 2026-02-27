'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getProById } from '@/lib/api';
import { useEffect, useState } from 'react';

/**
 * Booking - Select Service - Screen 5
 * Radio-like list of service options
 */
function BookingServiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proId = searchParams.get('proId');
  const [proName, setProName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!proId) return;
      const p = await getProById(proId);
      if (!mounted) return;
      setProName(p?.name ?? null);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [proId]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-2">Choose a service</h1>
        <p className="text-sm text-muted mb-6">
          {proName ? `For ${proName}. ` : ''}Service menus are being set up. For now, start from categories and continue from there.
        </p>

        <Card withRail className="mb-6">
          <div className="space-y-2">
            <div className="font-semibold text-text">Service menus (in progress)</div>
            <div className="text-sm text-muted">
              Soon, pros will be able to publish a clear menu and pricing here. Until then, use categories to browse.
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push('/customer/categories')} showArrow={false}>
            Browse categories
          </Button>
          {proId ? (
            <Link
              href={`/customer/pros/${encodeURIComponent(proId)}`}
              className="inline-flex items-center px-4 py-2 rounded-xl border border-border bg-surface2 hover:bg-surface transition-colors text-text font-medium"
            >
              Back to pro profile
            </Link>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

export default function BookingService() {
  return (
    <Suspense fallback={
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted/70">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <BookingServiceContent />
    </Suspense>
  );
}

