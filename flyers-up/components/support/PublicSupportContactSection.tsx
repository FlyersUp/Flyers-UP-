'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SupportMessageForm } from '@/components/settings/SupportMessageForm';
import { OFFICIAL_SUPPORT_EMAIL_DISPLAY } from '@/lib/support/official-contact';

/**
 * Public /support contact: authenticated users submit tickets via the same API as in-app settings.
 * Guests can email only (RLS requires a signed-in user_id on support_tickets).
 */
export function PublicSupportContactSection() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setAuthed(Boolean(session));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (authed === null) {
    return <p className="text-sm text-muted">Checking sign-in status…</p>;
  }

  if (!authed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted leading-relaxed">
          <span className="font-medium text-text">Submitting a support ticket requires a Flyers Up account.</span> We tie
          tickets to your profile so we can look up bookings and messages safely. Guests can still reach us by email.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/auth?next=${encodeURIComponent('/support')}`}
            className="inline-block px-4 py-2 bg-accent text-accentContrast rounded-lg hover:opacity-95 transition-opacity text-sm font-semibold"
          >
            Sign in to submit a ticket
          </Link>
          <a
            href={`mailto:${OFFICIAL_SUPPORT_EMAIL_DISPLAY}?subject=Support%20Request`}
            className="inline-block px-4 py-2 border border-border rounded-lg text-sm font-medium text-text hover:bg-surface2 transition-colors"
          >
            Email {OFFICIAL_SUPPORT_EMAIL_DISPLAY}
          </a>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          To report another member for abuse or safety concerns, sign in and use <strong className="text-text">Report</strong>{' '}
          from chat or a profile — that flow is separate from general support and from booking-specific issue tools.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        You&apos;re signed in. Your ticket is saved in our systems; we may send an optional email alert to our inbox when
        mail is configured. We do <span className="font-medium text-text">not</span> guarantee response times or outcomes
        here.
      </p>
      <SupportMessageForm variant="public" />
    </div>
  );
}
