'use client';

/**
 * Auth Page - Redirects to /signin
 * Kept for backwards compatibility
 */

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  
  useEffect(() => {
    // Redirect to signin page with role param if present
    const url = role ? `/signin?role=${role}` : '/signin';
    router.replace(url);
  }, [role, router]);

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <AuthRedirect />
    </Suspense>
  );
}
