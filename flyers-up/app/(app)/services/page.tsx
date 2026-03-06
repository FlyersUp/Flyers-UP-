'use client';

/**
 * Services Browse Page
 * Redirects to occupations (canonical browse experience).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServicesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/occupations');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-zinc-500">Redirecting…</p>
    </div>
  );
}
