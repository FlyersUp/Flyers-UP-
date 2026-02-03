/**
 * Customer view of a Pro profile.
 *
 * IMPORTANT: `/pro/*` is reserved for the Pro side of the app (dashboard/settings/messages).
 * Customer browsing should stay under `/customer/*` so navigation doesn't "flip sides".
 */

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { RatingCompact } from '@/components/ui/RatingStars';
import { getConversationId, getProById } from '@/lib/mockData';
import { getCurrentUser, getUserBookingPreferences, updateUserBookingPreferences } from '@/lib/api';

function CredentialItem({
  icon,
  label,
  value,
  verified,
}: {
  icon: string;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="text-center p-3 bg-surface2 rounded-xl">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-muted/70 mb-1">{label}</div>
      <div className="text-sm font-semibold text-text flex items-center justify-center gap-1">
        {value}
        {verified ? <span className="text-accent">✓</span> : null}
      </div>
    </div>
  );
}

export default function CustomerProProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/signin?next=/customer/pros/${encodeURIComponent(id)}`);
        return;
      }
      setReady(true);
    };
    void check();
  }, [id, router]);

  const pro = getProById(id);
  const [favorite, setFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(true);
  const proId = pro?.id;

  useEffect(() => {
    const load = async () => {
      setFavLoading(true);
      if (!ready || !proId) {
        setFavorite(false);
        setFavLoading(false);
        return;
      }
      const user = await getCurrentUser();
      if (!user) {
        setFavorite(false);
        setFavLoading(false);
        return;
      }
      const prefs = await getUserBookingPreferences(user.id);
      setFavorite(prefs.favoriteProIds.includes(proId));
      setFavLoading(false);
    };
    void load();
  }, [proId, ready]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted/70">Loading…</p>
        </div>
      </AppLayout>
    );
  }
  if (!pro) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-muted">Pro not found.</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-surface2 hover:bg-surface text-text rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  async function toggleFavorite() {
    const user = await getCurrentUser();
    if (!user) {
      alert('Please sign in to favorite pros.');
      return;
    }
    const prefs = await getUserBookingPreferences(user.id);
    if (!proId) return;
    const currently = prefs.favoriteProIds.includes(proId);
    const next = currently ? prefs.favoriteProIds.filter((x) => x !== proId) : [...prefs.favoriteProIds, proId];
    const res = await updateUserBookingPreferences(user.id, { favoriteProIds: next });
    if (!res.success) {
      alert(res.error || 'Failed to update favorites.');
      return;
    }
    setFavorite(!currently);
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/customer" className="text-sm text-muted hover:text-text">
            ← Back to Home
          </Link>
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            disabled={favLoading}
            className="p-2 rounded-lg hover:bg-surface2 transition-colors"
            title={favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className="text-xl">{favorite ? '♥' : '♡'}</span>
          </button>
        </div>

        <section className="bg-surface rounded-[18px] border border-hairline shadow-card p-6 mt-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface2 flex items-center justify-center">
              {pro.avatar && pro.avatar.trim() !== '' ? (
                <Image
                  src={pro.avatar}
                  alt={pro.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text">{pro.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <RatingCompact rating={pro.rating} />
                <span className="text-sm text-muted/70">({pro.reviewCount} reviews)</span>
              </div>

              {pro.badges?.length ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {pro.badges.map((badge) => (
                    <OfficialBadge key={typeof badge === 'string' ? badge : badge.id}>
                      {typeof badge === 'string' ? badge : badge.label}
                    </OfficialBadge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-surface2 rounded-xl">
              <p className="text-2xl font-bold text-text">{pro.startingPrice}</p>
              <p className="text-sm text-muted/70">Starting</p>
            </div>
            <div className="text-center p-3 bg-surface2 rounded-xl">
              <p className="text-2xl font-bold text-text">{pro.completedJobs ?? 0}</p>
              <p className="text-sm text-muted/70">Jobs</p>
            </div>
            <div className="text-center p-3 bg-surface2 rounded-xl">
              <p className="text-2xl font-bold text-text">{pro.responseTime ?? '—'}</p>
              <p className="text-sm text-muted/70">Response</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Link
              href={`/booking/${pro.id}`}
              className="flex-1 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-semibold text-center transition-opacity btn-press"
            >
              Book This Pro
            </Link>
            <Link
              href={`/customer/messages/${getConversationId('customer-1', pro.id)}`}
              className="px-4 py-3 bg-surface2 hover:bg-surface text-text rounded-xl font-medium transition-colors"
            >
              💬 Message
            </Link>
          </div>
        </section>

        <section className="bg-surface rounded-[18px] border border-hairline shadow-card p-6 mt-6">
          <h2 className="text-lg font-semibold text-text mb-4">Credentials &amp; Trust</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <CredentialItem icon="📅" label="Experience" value={`${pro.yearsExperience ?? 0} years`} verified />
            <CredentialItem icon="🛡️" label="Insurance" value={pro.insurance ? 'Verified' : 'Not verified'} verified={pro.insurance} />
            <CredentialItem icon="🏢" label="LLC" value={pro.llcVerified ? 'Verified' : 'Not verified'} verified={pro.llcVerified} />
            <CredentialItem icon="✓" label="Background" value={pro.backgroundChecked ? 'Checked' : 'Not checked'} verified={pro.backgroundChecked} />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}






