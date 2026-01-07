'use client';

/**
 * Booking Flow Page
 * Time slot selection and booking confirmation
 */

import { use, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { VerifiedBadge } from '@/components/ui/Badge';
import { RatingCompact } from '@/components/ui/RatingStars';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import TimeSlotScroller from '@/components/TimeSlotScroller';
import { getProById, generateAvailableDates, type TimeSlot } from '@/lib/mockData';

interface PageProps {
  params: Promise<{ proId: string }>;
}

export default function BookingPage({ params }: PageProps) {
  const { proId } = use(params);
  const pro = getProById(proId);
  
  // Generate available dates (memoized to prevent regeneration on each render)
  const availableDates = useMemo(() => generateAvailableDates(), []);
  
  // Booking state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  const handleTimeSelect = (date: string, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot || !address.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Booking submitted:', {
      proId: pro.id,
      proName: pro.name,
      date: selectedDate,
      time: selectedSlot.time,
      address,
      notes,
      estimatedPrice: pro.startingPrice,
    });
    
    setIsSubmitting(false);
    setShowConfirmation(true);
  };

  // Format selected date for display
  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Your booking with {pro.name} is confirmed for {formattedDate} at {selectedSlot?.time}.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {pro.avatar && pro.avatar.trim() !== '' ? (
                  <Image
                    src={pro.avatar}
                    alt={pro.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{pro.name}</p>
                <p className="text-sm text-gray-500">{pro.category}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600">📅 {formattedDate} at {selectedSlot?.time}</p>
              <p className="text-gray-600">📍 {address}</p>
            </div>
          </div>

          <TrustShieldBanner variant="inline" className="justify-center mb-6" />
          
          <div className="space-y-3">
            <Link
              href="/jobs/job-1"
              className="block w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors"
            >
              View Job Details
            </Link>
            <Link
              href="/"
              className="block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/pro/${pro.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <span>←</span>
              <span className="font-medium">Back</span>
            </Link>
            <h1 className="font-semibold text-gray-900">Book Appointment</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Pro summary card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {pro.avatar && pro.avatar.trim() !== '' ? (
                  <Image
                    src={pro.avatar}
                    alt={pro.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-gray-900">{pro.name}</h2>
                {pro.verified && <VerifiedBadge />}
              </div>
              <p className="text-sm text-gray-500 mb-1">{pro.category}</p>
              <RatingCompact rating={pro.rating} reviewCount={pro.reviewCount} />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">From</p>
              <p className="text-xl font-bold text-gray-900">${pro.startingPrice}</p>
            </div>
          </div>
        </section>

        {/* Time slot selector */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Select Date & Time</h3>
          <TimeSlotScroller 
            dates={availableDates} 
            onSelect={handleTimeSelect}
          />
        </section>

        {/* Address input */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Service Address</h3>
          <input
            type="text"
            placeholder="Enter your address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </section>

        {/* Notes input */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Special Instructions (Optional)</h3>
          <textarea
            placeholder="Any specific requests or information for the pro..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
        </section>

        {/* Trust shield */}
        <TrustShieldBanner variant="compact" className="mb-6" />

        {/* Booking summary */}
        {selectedDate && selectedSlot && (
          <section className="bg-teal-50 border border-teal-100 rounded-2xl p-6 mb-6 animate-fade-in">
            <h3 className="font-semibold text-teal-900 mb-4">Booking Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Service</span>
                <span className="text-teal-900 font-medium">{pro.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Date</span>
                <span className="text-teal-900 font-medium">{formattedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Time</span>
                <span className="text-teal-900 font-medium">{selectedSlot.time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Pro</span>
                <span className="text-teal-900 font-medium">{pro.name}</span>
              </div>
              <div className="pt-3 border-t border-teal-200 flex justify-between">
                <span className="text-teal-800 font-medium">Estimated Price</span>
                <span className="text-teal-900 font-bold text-lg">${pro.startingPrice}</span>
              </div>
            </div>
            <p className="text-xs text-teal-600 mt-3">
              * Final price may vary based on job scope. You&apos;ll confirm before payment.
            </p>
          </section>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedSlot || !address.trim() || isSubmitting}
            className={`
              w-full py-4 rounded-xl font-semibold text-lg transition-all btn-press
              ${selectedDate && selectedSlot && address.trim() && !isSubmitting
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Confirming...
              </span>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}




