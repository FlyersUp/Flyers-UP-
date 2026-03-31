import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { ProAccountClosedSignOutButton } from './SignOutButton';

/**
 * Landing for service pros whose profile is soft-closed.
 * They can sign in but cannot use the active pro dashboard.
 */
export default async function ProAccountClosedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=%2Fpro%2Faccount-closed');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'pro') {
    redirect('/');
  }

  if (profile.account_status !== 'closed') {
    redirect('/pro');
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 bg-bg text-text">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Your pro account is closed</h1>
        <p className="text-sm text-muted leading-relaxed">
          Your profile is no longer visible on Flyers Up and you will not receive new bookings. Payment, payout, and tax
          records stay on file as required.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Questions or need a full data export? Contact{' '}
          <a href="mailto:support@flyersup.app" className="text-accent underline">
            support@flyersup.app
          </a>
          .
        </p>
        <p className="text-xs text-muted pt-2">
          You can still sign in to view this page. To use Flyers Up as a customer, contact support if you need your role
          reviewed.
        </p>
        <ProAccountClosedSignOutButton />
      </div>
    </div>
  );
}
