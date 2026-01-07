'use client';

/**
 * Booking Form Component
 * Handles the booking request submission
 * 
 * Uses Supabase for creating bookings.
 * 
 * FUTURE IMPROVEMENTS:
 * - Add form validation library (e.g., react-hook-form + zod)
 * - Add date/time picker component
 * - Add address autocomplete
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking, getCurrentUser, type ServicePro } from '@/lib/api';

interface BookingFormProps {
  pro: ServicePro;
}

export default function BookingForm({ pro }: BookingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    address: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user from Supabase
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth?role=customer');
        return;
      }

      // Validate form
      if (!formData.date || !formData.time || !formData.address) {
        setError('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      // Create booking in Supabase
      await createBooking({
        customerId: user.id,
        proId: pro.id,
        date: formData.date,
        time: formData.time,
        address: formData.address,
        notes: formData.notes,
      });

      // Store success message for dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('booking_success', 'true');
      }

      // Redirect to customer dashboard
      router.push('/dashboard/customer');
    } catch (err) {
      setError('Failed to create booking. Please try again.');
      console.error('Booking error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get tomorrow's date as minimum selectable date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Date field */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Date *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          min={minDate}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
        />
      </div>

      {/* Time field */}
      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
          Preferred Time *
        </label>
        <input
          type="time"
          id="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
        />
      </div>

      {/* Address field */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Service Address *
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter your full address"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Notes field */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special instructions or details about the job..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Request Booking'}
      </button>

      {/* Info text */}
      <p className="text-xs text-gray-500 text-center">
        By submitting, you agree to the service terms. The pro will confirm your booking shortly.
      </p>
    </form>
  );
}
