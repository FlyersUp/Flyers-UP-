'use client';

/**
 * Booking Flow Page
 * Time slot selection and booking confirmation
 */

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { VerifiedBadge } from '@/components/ui/Badge';
import { RatingCompact } from '@/components/ui/RatingStars';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import TimeSlotScroller from '@/components/TimeSlotScroller';
import { getProById, generateAvailableDates, type TimeSlot } from '@/lib/mockData';
import { getCurrentUser, listUserAddresses } from '@/lib/api';

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
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; label: string; line1: string; formatted: string }>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(''); // '' => custom
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const loadAddresses = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const list = await listUserAddresses(user.id);
      const mapped = list.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        formatted: [a.line1, a.line2, [a.city, a.state, a.postalCode].filter(Boolean).join(', ')]
          .filter((x) => x && String(x).trim() !== '')
          .join(a.line2 ? '\n' : ', '),
      }));
      setSavedAddresses(mapped);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def && !address) {
        const formatted = [def.line1, def.line2, [def.city, def.state, def.postalCode].filter(Boolean).join(', ')]
          .filter((x) => x && String(x).trim() !== '')
          .join(def.line2 ? '\n' : ', ');
        setAddress(formatted);
        setSelectedAddressId(def.id);
      }
    };
    void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="min-h-screen bg-surface2 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl border border-border p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Booking Confirmed!</h1>
          <p className="text-muted mb-6">
            Your booking with {pro.name} is confirmed for {formattedDate} at {selectedSlot?.time}.
          </p>
          
          <div className="bg-surface2 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface2 flex items-center justify-center">
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
                <p className="font-semibold text-text">{pro.name}</p>
                <p className="text-sm text-muted/70">{pro.category}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted">📅 {formattedDate} at {selectedSlot?.time}</p>
              <p className="text-muted">📍 {address}</p>
            </div>
          </div>

          <TrustShieldBanner variant="inline" className="justify-center mb-6" />
          
          <div className="space-y-3">
            <Link
              href="/jobs/job-1"
              className="block w-full py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-semibold transition-opacity"
            >
              View Job Details
            </Link>
            <Link
              href="/"
              className="block w-full py-3 bg-surface2 hover:bg-surface text-text rounded-xl font-medium transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface2">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/customer/pros/${pro.id}`}
              className="flex items-center gap-2 text-muted hover:text-text transition-colors"
            >
              <span>←</span>
              <span className="font-medium">Back</span>
            </Link>
            <h1 className="font-semibold text-text">Book Appointment</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Pro summary card */}
        <section className="bg-surface rounded-2xl border border-border p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface2 flex items-center justify-center">
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
                <h2 className="font-semibold text-text">{pro.name}</h2>
                {pro.verified && <VerifiedBadge />}
              </div>
              <p className="text-sm text-muted/70 mb-1">{pro.category}</p>
              <RatingCompact rating={pro.rating} reviewCount={pro.reviewCount} />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted/70">From</p>
              <p className="text-xl font-bold text-text">${pro.startingPrice}</p>
            </div>
          </div>
        </section>

        {/* Time slot selector */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-text mb-4">Select Date & Time</h3>
          <TimeSlotScroller 
            dates={availableDates} 
            onSelect={handleTimeSelect}
          />
        </section>

        {/* Address input */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-text mb-4">Service Address</h3>
          {savedAddresses.length > 0 && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-text mb-1">Saved addresses</label>
              <select
                value={selectedAddressId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedAddressId(nextId);
                  const chosen = savedAddresses.find((a) => a.id === nextId);
                  if (chosen) setAddress(chosen.formatted);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface"
              >
                {savedAddresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.label || 'address').toUpperCase()} — {a.line1}
                  </option>
                ))}
                <option value="">Custom…</option>
              </select>
            </div>
          )}
          <input
            type="text"
            placeholder="Enter your address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setSelectedAddressId('');
            }}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-transparent"
          />
          <p className="text-xs text-muted/70 mt-2">
            Manage saved addresses in <Link className="underline" href="/customer/settings/addresses">Settings → Addresses</Link>.
          </p>
        </section>

        {/* Notes input */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-text mb-4">Special Instructions (Optional)</h3>
          <textarea
            placeholder="Any specific requests or information for the pro..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-transparent resize-none"
          />
        </section>

        {/* Trust section */}
        <TrustShieldBanner variant="compact" className="mb-6" />

        {/* Booking summary */}
        {selectedDate && selectedSlot && (
          <section className="bg-surface2 border border-border rounded-2xl p-6 mb-6 animate-fade-in">
            <h3 className="font-semibold text-text mb-4">Booking Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Service</span>
                <span className="text-text font-medium">{pro.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Date</span>
                <span className="text-text font-medium">{formattedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Time</span>
                <span className="text-text font-medium">{selectedSlot.time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Pro</span>
                <span className="text-text font-medium">{pro.name}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between">
                <span className="text-text font-medium">Estimated Price</span>
                <span className="text-text font-bold text-lg">${pro.startingPrice}</span>
              </div>
            </div>
            <p className="text-xs text-accent mt-3">
              * Final price may vary based on job scope. You&apos;ll confirm before payment.
            </p>
          </section>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-surface border-t border-border p-4 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedSlot || !address.trim() || isSubmitting}
            className={`
              w-full py-4 rounded-xl font-semibold text-lg transition-all btn-press
              ${selectedDate && selectedSlot && address.trim() && !isSubmitting
                ? 'bg-accent hover:opacity-95 text-accentContrast'
                : 'bg-surface2 text-muted/60 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-text/20 border-t-text rounded-full animate-spin" />
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




