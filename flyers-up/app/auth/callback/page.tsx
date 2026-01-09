'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Handle PKCE code exchange (OAuth + magic links).
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          setError(userError.message);
          return;
        }
        if (!user) {
          setError('Your link is invalid or expired. Please try again.');
          return;
        }

        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (!profile) {
          setError('Could not load your profile. Please try again.');
          return;
        }

        router.replace(routeAfterAuth(profile, nextParam));
      } catch (err) {
        console.error(err);
        setError('Something went wrong. Please try again.');
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfbf7] flex flex-col">
      <header className="px-4 py-5">
        <div className="max-w-md mx-auto">
          <Logo size="md" linkToHome />
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 text-center">
            {!error ? (
              <>
                <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-gray-900 font-medium">Finishing up…</div>
                <div className="text-sm text-gray-600 mt-1">One moment.</div>
              </>
            ) : (
              <>
                <div className="text-gray-900 font-semibold">We couldn’t sign you in</div>
                <div className="text-sm text-gray-600 mt-2">{error}</div>
                <button
                  className="mt-5 w-full rounded-xl bg-emerald-700 text-white px-4 py-3.5 text-base font-medium hover:bg-emerald-800"
                  onClick={() => router.replace('/auth')}
                >
                  Try again
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbf7] flex items-center justify-center">
          <div className="text-sm text-gray-600">Loading…</div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}


