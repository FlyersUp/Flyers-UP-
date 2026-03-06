'use client';

/**
 * Reset Password
 * Landed on from Supabase email link. Hash fragment contains session tokens.
 * Supabase client auto-exchanges the hash for a session on load.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Supabase exchanges URL hash for session automatically. Allow a brief moment for exchange.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          setReady(true);
          return;
        }
        // Hash exchange may be async; retry once after a short delay.
        await new Promise((r) => setTimeout(r, 300));
        if (cancelled) return;
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (cancelled) return;
        setReady(true);
        if (!s2) {
          setError('This reset link may have expired. Request a new one from the forgot password page.');
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    };
    void check();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      router.replace('/settings/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-black/60">Checking your reset link…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="px-4 py-5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Logo size="md" linkToHome />
          <Link href="/auth" className="text-sm text-muted hover:text-text transition-colors">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-6">
            <h1 className="text-xl font-semibold text-text">Set new password</h1>
            <p className="text-sm text-black/60 mt-1">
              Enter your new password below. Use at least 8 characters.
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-text">
                {error}
              </div>
            )}

            {error?.toLowerCase().includes('expired') ? (
              <div className="mt-6">
                <Link
                  href="/auth/forgot-password"
                  className="inline-block w-full py-3 rounded-xl font-medium bg-accent text-accentContrast hover:opacity-95 text-center"
                >
                  Request new reset link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-text mb-1.5">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                  <p className="text-xs text-black/60 mt-1">At least 8 characters</p>
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="block text-sm font-medium text-text mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || password !== confirmPassword || password.length < MIN_PASSWORD_LENGTH}
                  className="w-full py-3 rounded-xl font-medium bg-accent text-accentContrast hover:opacity-95 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-black/60">
            <Link href="/auth" className="font-medium text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
