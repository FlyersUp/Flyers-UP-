'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';

export default function AdminDisputesPage() {
  const [bookingId, setBookingId] = useState('');

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6">
        <Link href="/admin" className="text-sm text-muted hover:text-text">← Admin</Link>
        <h1 className="text-2xl font-semibold mt-2">Dispute Evidence</h1>
        <p className="text-sm text-muted mt-1">View booking evidence, timeline, and policy decisions.</p>

        <div className="mt-6 flex gap-2">
          <input
            type="text"
            placeholder="Enter booking ID"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="flex-1 px-4 py-2 border border-black/10 rounded-lg"
          />
          <Link
            href={bookingId.trim() ? `/admin/disputes/${bookingId.trim()}` : '#'}
            className={`px-4 py-2 rounded-lg font-medium ${bookingId.trim() ? 'bg-accent text-white hover:opacity-95' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            View
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
