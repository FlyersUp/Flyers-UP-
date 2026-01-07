'use client';

/**
 * Pro Profile Page
 * Detailed view of a service professional with credentials, reviews, and booking CTA
 */

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Badge, { VerifiedBadge, LevelBadge } from '@/components/ui/Badge';
import RatingStars from '@/components/ui/RatingStars';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import ReviewItem from '@/components/ReviewItem';
import PageLayout from '@/components/PageLayout';
import { getProById, getProReviews, getConversationId, type MockPro, type Review } from '@/lib/mockData';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const pro = getProById(id);
  const reviews = getProReviews(id);

  if (!pro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pro Not Found</h1>
          <p className="text-gray-500 mb-6">This professional may no longer be available.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
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
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <span className="text-xl">♡</span>
        </button>
      </div>

      {/* Main content */}
      <div>
        {/* Profile header */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          {/* Cover gradient */}
          <div className="h-24 bg-gradient-to-r from-teal-500 to-emerald-500" />
          
          {/* Profile info */}
          <div className="px-6 pb-6">
            {/* Avatar - overlapping cover */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
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
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-3 border-white rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{pro.name}</h1>
                  {pro.verified && <VerifiedBadge size="md" />}
                </div>
                <p className="text-gray-600">{pro.category} • {pro.location}</p>
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
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{pro.yearsExperience}</p>
                <p className="text-sm text-gray-500">Years Exp.</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-2xl font-bold text-gray-900">
                  {(pro.completedJobs ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Jobs Done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{pro.responseTime}</p>
                <p className="text-sm text-gray-500">Response</p>
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
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-center transition-colors btn-press"
              >
                Book This Pro
              </Link>
              <Link
                href={`/messages/${getConversationId('customer-1', pro.id)}`}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                💬 Message
              </Link>
            </div>
          </div>
        </section>

        {/* Credentials section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Credentials & Trust</h2>
          
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
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {(pro.certifications ?? []).map((cert, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    🎓 {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Bio section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
          <p className="text-gray-700 leading-relaxed">{pro.bio}</p>
        </section>

        {/* Trust shield */}
        <TrustShieldBanner variant="compact" className="mb-6" />

        {/* Reviews section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
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
            <p className="text-gray-500 text-center py-8">No reviews yet</p>
          )}

          {reviews.length > 0 && (
            <button className="w-full mt-4 py-3 text-teal-600 hover:bg-teal-50 rounded-xl font-medium transition-colors">
              See All {pro.reviewCount} Reviews
            </button>
          )}
        </section>

        {/* Pricing section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">${pro.startingPrice}</span>
            <span className="text-gray-500">starting price</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Final price may vary based on job scope. You&apos;ll receive a quote before booking confirmation.
          </p>
        </section>

        {/* Bottom CTA */}
        <div className="sticky bottom-16 bg-white border-t border-gray-100 p-4 -mx-4 mt-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Starting at</p>
              <p className="text-xl font-bold text-gray-900">${pro.startingPrice}</p>
            </div>
            <Link
              href={`/booking/${pro.id}`}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors btn-press"
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
    <div className={`p-3 rounded-xl ${verified ? 'bg-emerald-50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        {verified && <span className="text-emerald-500 text-xs">✓</span>}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-medium ${verified ? 'text-emerald-700' : 'text-gray-500'}`}>
        {value}
      </p>
    </div>
  );
}




