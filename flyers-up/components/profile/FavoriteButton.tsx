'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export function FavoriteButton({ proId, className = '' }: { proId: string; className?: string }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user) return;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (!mounted) return;
        if ((profile?.role ?? 'customer') !== 'customer') return;
        setIsCustomer(true);

        const res = await fetch('/api/customer/favorites', { cache: 'no-store' });
        const json = await res.json();
        if (mounted && json.ok && json.favorites) {
          const fav = json.favorites.some((f: { proId: string }) => f.proId === proId);
          setIsFavorite(fav);
        }
      } catch {
        if (mounted) setIsFavorite(false);
      }
    })();
    return () => { mounted = false; };
  }, [proId]);

  const toggle = async () => {
    setLoading(true);
    try {
      if (isFavorite) {
        const res = await fetch(`/api/customer/favorites?proId=${encodeURIComponent(proId)}`, { method: 'DELETE' });
        if (res.ok) setIsFavorite(false);
      } else {
        const res = await fetch('/api/customer/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proId }),
        });
        if (res.ok) setIsFavorite(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isCustomer) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full p-0 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 ${className}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`h-5 w-5 transition-colors ${isFavorite ? 'fill-[#B2FBA5] text-[#B2FBA5]' : 'text-muted hover:text-[#B2FBA5]'}`}
      />
    </button>
  );
}
