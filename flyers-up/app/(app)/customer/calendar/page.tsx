'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { CustomerScheduleView } from '@/components/schedule/CustomerScheduleView';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useScheduleEvents } from '@/hooks/useScheduleEvents';

export default function CustomerCalendarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Account');

  const { events, loading } = useScheduleEvents({ role: 'customer', enabled: ready });

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/customer/calendar')}`);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if ((profile?.role ?? 'customer') !== 'customer') {
        router.replace('/customer');
        return;
      }
      const fallback = user.email?.split('@')[0] ?? 'Account';
      const full = user.fullName?.trim();
      setUserName(full || fallback);
      setReady(true);
    };
    void guard();
  }, [router]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <CustomerPageShell title="My schedule" userName={userName}>
          <div className="mx-auto flex min-h-[40vh] max-w-4xl items-center justify-center px-4">
            <p className="text-sm text-text3">Loading…</p>
          </div>
        </CustomerPageShell>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <CustomerPageShell
        title="My schedule"
        userName={userName}
        subtitle="Keep track of your local services and bookings — everything stays in one place."
      >
        <div className="px-3 pb-6 pt-2 sm:px-4">
          <CustomerScheduleView events={events} loading={loading} />
        </div>
      </CustomerPageShell>
    </AppLayout>
  );
}
