'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { ProScheduleView } from '@/components/schedule/ProScheduleView';
import { ProCalendarAvailabilityPanel } from '@/components/pro/ProCalendarAvailabilityPanel';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useScheduleEvents } from '@/hooks/useScheduleEvents';

export default function ProCalendarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Account');

  const { events, loading } = useScheduleEvents({ role: 'pro', enabled: ready });

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/pro/calendar')}`);
        return;
      }
      const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (!pro) {
        router.replace('/pro');
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
      <AppLayout mode="pro">
        <ProPageShell title="Work calendar" userName={userName}>
          <div className="mx-auto flex min-h-[40vh] max-w-4xl items-center justify-center px-4">
            <p className="text-sm text-text3">Loading…</p>
          </div>
        </ProPageShell>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <ProPageShell
        title="Work calendar"
        userName={userName}
        subtitle="Tap a date to see every job that day — your workload at a glance."
      >
        <div className="space-y-8 px-3 pb-8 pt-2 sm:px-4">
          <ProScheduleView events={events} loading={loading} />
          <ProCalendarAvailabilityPanel />
        </div>
      </ProPageShell>
    </AppLayout>
  );
}
