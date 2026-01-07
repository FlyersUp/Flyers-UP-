'use client';

/**
 * Sign In / Sign Up Page
 * Unified authentication page for customers and pros
 * Uses query params for role and mode
 */

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { getCurrentUser, signIn, signUp } from '@/lib/api';

type UserRole = 'customer' | 'pro';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const modeParam = searchParams.get('mode');

  const role: UserRole = roleParam === 'pro' ? 'pro' : 'customer';
  const [isSignUp, setIsSignUp] = useState(modeParam === 'signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSignUp(modeParam === 'signup');
  }, [modeParam]);

  useEffect(() => {
    setError(null);
  }, [isSignUp]);

  useEffect(() => {
    const redirectIfAuthed = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      router.push(user.role === 'pro' ? '/dashboard/pro' : '/dashboard/customer');
    };
    void redirectIfAuthed();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = isSignUp
        ? await signUp(role, email, password)
        : await signIn(email, password);

      if (result.success && result.user) {
        router.push(result.user.role === 'pro' ? '/dashboard/pro' : '/dashboard/customer');
      } else {
        setError(result.error || 'Unable to continue. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      <header className="px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                role === 'customer'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {role === 'customer' ? 'Customer Account' : 'Service Pro Account'}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isSignUp
                ? `Sign up as a ${role === 'customer' ? 'customer' : 'service professional'}`
                : 'Sign in to continue'}
            </p>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            <Link
              href={`/signin?role=customer${isSignUp ? '&mode=signup' : ''}`}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'customer'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer
            </Link>
            <Link
              href={`/signin?role=pro${isSignUp ? '&mode=signup' : ''}`}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'pro'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Service Pro
            </Link>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                !isSignUp
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                isSignUp
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                role === 'customer'
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400'
              } text-white`}
            >
              {isLoading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}



