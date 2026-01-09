'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';

type Step = 'entry' | 'email';

function AuthInner() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const errorParam = searchParams.get('error');

  const [step, setStep] = useState<Step>('entry');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);

  const redirectTo = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${origin}/auth/callback`;
    if (nextParam && nextParam.startsWith('/')) {
      return `${base}?next=${encodeURIComponent(nextParam)}`;
    }
    return base;
  }, [nextParam]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('loading');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        setStatus('error');
        setError(otpError.message);
        return;
      }

      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
  }

  async function handleGoogle() {
    setError(null);
    setStatus('loading');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) {
        setStatus('error');
        setError(oauthError.message);
      }
    } catch (err) {
      setStatus('error');
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbf7] text-gray-900">
      <div className="min-h-screen flex flex-col">
        <header className="px-4 py-5">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Logo size="md" linkToHome />
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Back
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 pb-10">
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="p-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Local help. Real people. Simple bookings.
                </h1>
                <p className="text-gray-600 mt-2">
                  Get started in a minute. You can add details later.
                </p>

                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {step === 'entry' && (
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="w-full rounded-xl bg-emerald-700 text-white px-4 py-3.5 text-base font-medium hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
                      disabled={status === 'loading'}
                    >
                      Continue with Email
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogle}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                      disabled={status === 'loading'}
                    >
                      Continue with Google
                    </button>

                    <div className="pt-2 text-sm text-gray-600">
                      Already have an account?{' '}
                      <Link href={nextParam ? `/signin?next=${encodeURIComponent(nextParam)}` : '/signin'} className="text-emerald-700 hover:text-emerald-900 font-medium">
                        Log in
                      </Link>
                    </div>
                  </div>
                )}

                {step === 'email' && (
                  <div className="mt-6">
                    {status !== 'sent' ? (
                      <form onSubmit={handleSendLink} className="space-y-4">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={status === 'loading'}
                          className="w-full rounded-xl bg-emerald-700 text-white px-4 py-3.5 text-base font-medium hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
                        >
                          {status === 'loading' ? 'Sending…' : 'Send me a link'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStep('entry');
                            setStatus('idle');
                            setError(null);
                          }}
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          Back
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                        <div className="font-medium text-emerald-900">Check your email</div>
                        <div className="text-sm text-emerald-800 mt-1">
                          We sent a secure link to <span className="font-medium">{email}</span>.
                        </div>
                        <div className="text-sm text-emerald-800 mt-1">
                          Tap it to finish signing in.
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('idle');
                              setError(null);
                            }}
                            className="rounded-xl bg-white border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                          >
                            Send again
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep('entry')}
                            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500 leading-relaxed">
              By continuing, you agree to use Flyers Up respectfully and keep communication on-platform.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbf7] flex items-center justify-center">
          <div className="text-sm text-gray-600">Loading…</div>
        </div>
      }
    >
      <AuthInner />
    </Suspense>
  );
}
