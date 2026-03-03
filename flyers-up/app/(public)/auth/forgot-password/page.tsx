'use client';

/**
 * Forgot Password (public)
 * Sends a reset link to the user's email via Supabase.
 */

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset-password`
          : (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || '') + '/auth/reset-password';

      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });

      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex flex-col">
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
            <h1 className="text-xl font-semibold text-text">Forgot password?</h1>
            <p className="text-sm text-black/60 mt-1">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {success ? (
              <div className="mt-6 p-4 rounded-xl bg-accent/10 border border-accent/20 text-text">
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-black/70 mt-1">
                  We sent a reset link to <span className="font-medium">{email}</span>. Click the link to set a new password.
                </p>
                <p className="text-xs text-black/60 mt-2">
                  Didn&apos;t get it? Check spam or try again.
                </p>
                <Link
                  href="/auth"
                  className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-text">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-text mb-1.5">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-medium bg-accent text-accentContrast hover:opacity-95 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-black/60">
            Remember your password?{' '}
            <Link href="/signin" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
