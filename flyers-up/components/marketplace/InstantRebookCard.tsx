'use client';

import Link from 'next/link';

export interface InstantRebookCardProps {
  proName: string;
  proId: string;
  lastServiceType: string;
  lastDate: string;
  rating: number;
  bookingId: string;
  className?: string;
}

export function InstantRebookCard({
  proName,
  proId,
  lastServiceType,
  lastDate,
  rating,
  bookingId,
  className = '',
}: InstantRebookCardProps) {
  const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">Book Again</h3>
      <p className="text-lg font-semibold text-[#111] mb-2">Book {proName} Again</p>
      <div className="text-sm text-[#3A3A3A] mb-2">
        <p>Last job: {lastServiceType}</p>
        <p>{lastDate}</p>
        <p className="text-amber-600 mt-1">{stars}</p>
      </div>
      <div className="flex gap-2 mt-4">
        <Link
          href={`/book/${proId}?rebook=${bookingId}`}
          prefetch={false}
          className="flex-1 py-3 rounded-xl bg-[#B2FBA5] text-black font-semibold text-center hover:opacity-95 transition-opacity"
        >
          Rebook Same Service
        </Link>
        <Link
          href={`/customer/chat/${bookingId}`}
          className="flex-1 py-3 rounded-xl border border-black/20 text-[#111] font-medium text-center hover:bg-[#F5F5F5] transition-colors"
        >
          Message Pro
        </Link>
      </div>
    </div>
  );
}
