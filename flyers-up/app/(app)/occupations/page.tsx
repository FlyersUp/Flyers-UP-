'use client';

/**
 * Browse occupations — public-style shell when signed out; app chrome when signed in.
 */
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { MobileScrollRoot } from '@/components/layouts/MobileScrollRoot';
import { OccupationsBrowsePageContent } from '@/components/occupations/OccupationsBrowsePageContent';
import { PublicOccupationsBrowseShell } from '@/components/occupations/PublicOccupationsBrowseShell';
import { getCurrentUser } from '@/lib/api';

export default function OccupationsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void getCurrentUser().then((u) => setSignedIn(!!u));
  }, []);

  if (signedIn === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-text">
        <p className="text-sm text-text3">Loading…</p>
      </div>
    );
  }

  const content = <OccupationsBrowsePageContent />;

  if (!signedIn) {
    return <PublicOccupationsBrowseShell>{content}</PublicOccupationsBrowseShell>;
  }

  return (
    <AppLayout mode="customer">
      <MobileScrollRoot className="flex min-h-0 flex-1 flex-col bg-bg pb-32">{content}</MobileScrollRoot>
    </AppLayout>
  );
}
