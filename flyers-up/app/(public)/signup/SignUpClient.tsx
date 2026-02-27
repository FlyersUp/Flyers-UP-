'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile } from '@/lib/onboarding';

type UserRole = 'customer' | 'pro';

const TERMS_VERSION = '2026-01-27';
const RESEND_COOLDOWN_SEC = 30;

export function SignUpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') ? nextParam : null;
  const roleRaw = searchParams.get('role');

  const role: UserRole = roleRaw === 'pro' ? 'pro' : 'customer';

  // Client-side redirect if already signed in (replaces server auth check).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (cancelled) return;
        const userRole = (profile?.role as UserRole | null) ?? (session.user.user_metadata?.role as UserRole | null) ?? 'customer';
        router.replace(userRole === 'pro' ? '/pro' : '/customer');
      } catch {
        // ignore - just show the form
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router]);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          data: { role },
        },
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setStep('code');
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          data: { role },
        },
      });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      setError('Failed to resend. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setError('Enter the 6-digit code we emailed you (numbers only).');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError('No email on file. Go back and try again.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmed,
        token: code,
        type: 'email',
      });

      if (verifyError) {
        const msg = verifyError.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid')) {
          setError('That code is invalid or expired. Request a new code below.');
        } else {
          setError(verifyError.message);
        }
        return;
      }

      if (!data.user) {
        setError('Verification succeeded but no session. Please try again.');
        return;
      }

      const profileRole = (data.user.user_metadata?.role as UserRole) || role;
      let profile = await getOrCreateProfile(data.user.id, data.user.email ?? null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/legal/acceptance', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ termsVersion: TERMS_VERSION }),
        });
      } catch {
        // ignore
      }
      await upsertProfile({
        id: data.user.id,
        role: profileRole,
        onboarding_step: profileRole === 'pro' ? 'pro_profile' : 'customer_profile',
      });
      profile = await getOrCreateProfile(data.user.id, data.user.email ?? null);
      if (profile) {
        const dest = routeAfterAuth(
          { ...profile, role: profileRole },
          safeNext ?? (profileRole === 'pro' ? '/pro' : '/customer')
        );
        router.replace(dest);
      } else {
        router.replace(profileRole === 'pro' ? '/pro' : '/customer');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex flex-col">
      <header className="px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <Link href="/" className="text-sm text-muted hover:text-text transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                role === 'customer' ? 'bg-success/15 text-text border border-border' : 'bg-warning/15 text-text border border-border'
              }`}
            >
              {role === 'customer' ? 'Customer account' : 'Service Pro account'}
            </div>
            <h1 className="text-2xl font-bold text-text">
              {step === 'email' ? 'Create your account' : 'Enter your code'}
            </h1>
            <p className="text-muted mt-2">
              {step === 'email'
                ? role === 'customer'
                  ? 'We\'ll send you a 6-digit code to verify your email.'
                  : 'We\'ll send you a 6-digit code to verify your email.'
                : `Enter the 6-digit code we sent to ${email}`}
            </p>
          </div>

          <div className="flex mb-6 bg-surface2 border border-border rounded-xl p-1">
            <Link
              href="/signup?role=customer"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'customer' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Customer
            </Link>
            <Link
              href="/signup?role=pro"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'pro' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Service Pro
            </Link>
          </div>

          {error && (
            <div className="mb-4 bg-danger/10 text-text px-4 py-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-medium transition-opacity bg-accent text-accentContrast hover:opacity-95 disabled:opacity-50"
              >
                {isLoading ? 'Sending code…' : 'Send 6-digit code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-muted mb-1">
                  6-digit code
                </label>
                <input
                  ref={otpInputRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-border rounded-lg bg-surface text-text placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || otp.replace(/\D/g, '').length !== 6}
                className="w-full py-3 rounded-lg font-medium transition-opacity bg-accent text-accentContrast hover:opacity-95 disabled:opacity-50"
              >
                {isLoading ? 'Verifying…' : 'Verify and create account'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-muted hover:text-text"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-muted hover:text-text disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link href={`/auth${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`} className="text-text hover:opacity-80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
