'use client';

/**
 * Pro Profile Page
 * Detailed view of a service professional with credentials, reviews, and booking CTA
 */

import { use, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Badge, { VerifiedBadge, LevelBadge } from '@/components/ui/Badge';
import RatingStars from '@/components/ui/RatingStars';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import ReviewItem from '@/components/ReviewItem';
import PageLayout from '@/components/PageLayout';
import { getProById, getProReviews, getConversationId, type MockPro, type Review } from '@/lib/mockData';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    // `/pro/[id]` is a legacy customer-browsing route. Keep customers on the customer side.
    router.replace(`/customer/pros/${id}`);
  }, [router, id]);
  const pro = getProById(id);
  const reviews = getProReviews(id);

  if (!pro) {
    return (
      <div className="min-h-screen bg-surface2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-text mb-2">Pro Not Found</h1>
          <p className="text-muted/70 mb-6">This professional may no longer be available.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-medium transition-opacity"
          >
            Browse All Pros
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageLayout showBackButton>
      {/* Header */}
      <div className="mb-6 flex items-center justify-end">
        <button className="p-2 text-muted/70 hover:text-text hover:bg-surface2 rounded-lg transition-colors">
          <span className="text-xl">♡</span>
        </button>
      </div>

      {/* Main content */}
      <div>
        {/* Profile header */}
        <section className="bg-surface rounded-2xl border border-border overflow-hidden mb-6">
          {/* Cover gradient */}
          <div className="h-24 bg-gradient-to-r from-accent to-accent/80" />
          
          {/* Profile info */}
          <div className="px-6 pb-6">
            {/* Avatar - overlapping cover */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-surface border-4 border-surface shadow-lg bg-surface2 flex items-center justify-center">
                  {pro.avatar && pro.avatar.trim() !== '' ? (
                    <Image
                      src={pro.avatar}
                      alt={pro.name || 'Pro avatar'}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-4xl">👤</span>
                  )}
                </div>
                {pro.available && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent border-3 border-surface rounded-full flex items-center justify-center">
                    <span className="text-accentContrast text-xs">✓</span>
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-text">{pro.name}</h1>
                  {pro.verified && <VerifiedBadge size="md" />}
                </div>
                <p className="text-muted">{pro.category} • {pro.location}</p>
              </div>
            </div>

            {/* Rating and level */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <RatingStars 
                rating={pro.rating} 
                showCount 
                reviewCount={pro.reviewCount}
                size="lg"
              />
              <LevelBadge level={pro.level} title={pro.levelTitle} />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-surface2 rounded-xl mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-text">{pro.yearsExperience}</p>
                <p className="text-sm text-muted/70">Years Exp.</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-2xl font-bold text-text">
                  {(pro.completedJobs ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted/70">Jobs Done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text">{pro.responseTime}</p>
                <p className="text-sm text-muted/70">Response</p>
              </div>
            </div>

            {/* Gamification badges */}
            {pro.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {pro.badges.map((badge) => {
                  const b =
                    typeof badge === 'string'
                      ? { id: badge, label: badge, icon: undefined, color: undefined }
                      : badge;
                  const variant =
                    b.color === 'verified' || b.color === 'highlight' || b.color === 'default'
                      ? b.color
                      : undefined;
                  return (
                    <Badge
                      key={b.id}
                      variant={variant}
                    >
                      {b.icon ? `${b.icon} ${b.label}` : b.label}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-3">
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
          </div>
        </section>

        {/* Credentials section */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Credentials & Trust</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <CredentialItem
              icon="📅"
              label="Experience"
              value={`${pro.yearsExperience} years`}
              verified
            />
            <CredentialItem
              icon="🛡️"
              label="Insurance"
              value={pro.insurance ? 'Verified' : 'Not verified'}
              verified={pro.insurance ?? false}
            />
            <CredentialItem
              icon="🏢"
              label="LLC"
              value={pro.llcVerified ? 'Verified' : 'Not verified'}
              verified={pro.llcVerified ?? false}
            />
            <CredentialItem
              icon="✓"
              label="Background"
              value={pro.backgroundChecked ? 'Checked' : 'Not checked'}
              verified={pro.backgroundChecked ?? false}
            />
          </div>

          {(pro.certifications?.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium text-text mb-2">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {(pro.certifications ?? []).map((cert, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-info/10 text-info rounded-full text-sm border border-border"
                  >
                    🎓 {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Bio section */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-text mb-4">About</h2>
          <p className="text-text leading-relaxed">{pro.bio}</p>
        </section>

        {/* Trust section */}
        <TrustShieldBanner variant="compact" className="mb-6" />

        {/* Reviews section */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">Reviews</h2>
            <RatingStars rating={pro.rating} showCount reviewCount={pro.reviewCount} size="sm" />
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  userName={review.userName || review.customerName}
                  userAvatar={review.userAvatar || ''}
                  rating={review.rating}
                  comment={review.comment}
                  date={review.date}
                  helpful={review.helpful}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted/70 text-center py-8">No reviews yet</p>
          )}

          {reviews.length > 0 && (
            <button className="w-full mt-4 py-3 text-accent hover:bg-accent/10 rounded-xl font-medium transition-colors">
              See All {pro.reviewCount} Reviews
            </button>
          )}
        </section>

        {/* Pricing section */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Pricing</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-text">${pro.startingPrice}</span>
            <span className="text-muted/70">starting price</span>
          </div>
          <p className="text-sm text-muted/70 mt-2">
            Final price may vary based on job scope. You&apos;ll receive a quote before booking confirmation.
          </p>
        </section>

        {/* Bottom CTA */}
        <div className="sticky bottom-16 bg-surface border-t border-border p-4 -mx-4 mt-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted/70">Starting at</p>
              <p className="text-xl font-bold text-text">${pro.startingPrice}</p>
            </div>
            <Link
              href={`/booking/${pro.id}`}
              className="px-8 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-semibold transition-opacity btn-press"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// Credential item component
function CredentialItem({ 
  icon, 
  label, 
  value, 
  verified 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  verified: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl ${verified ? 'bg-success/15' : 'bg-surface2'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        {verified && <span className="text-success text-xs">✓</span>}
      </div>
      <p className="text-xs text-muted/70">{label}</p>
      <p className={`text-sm font-medium ${verified ? 'text-text' : 'text-muted/70'}`}>
        {value}
      </p>
    </div>
  );
}




