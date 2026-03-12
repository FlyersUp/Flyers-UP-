'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface JobCompletedFlyerProps {
  proName: string;
  serviceType: string;
  neighborhood: string;
  rating: number;
  beforePhotoUrls?: string[];
  afterPhotoUrls: string[];
  completionId: string;
  className?: string;
}

const SHARE_TEXT = 'Another home cleaned in Brooklyn ✔\nBook trusted local pros on Flyers Up';

export function JobCompletedFlyer({
  proName,
  serviceType,
  neighborhood,
  rating,
  beforePhotoUrls = [],
  afterPhotoUrls,
  completionId,
  className = '',
}: JobCompletedFlyerProps) {
  const [shareCount, setShareCount] = useState(0);
  const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  const recordShare = () => {
    setShareCount((c) => c + 1);
    fetch(`/api/job-completions/${completionId}/share`, { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  const handleCopyLink = async () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/discover/jobs?c=${completionId}`;
    await navigator.clipboard?.writeText(url);
    recordShare();
  };

  const handleShare = (platform: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/discover/jobs?c=${completionId}`;
    const text = SHARE_TEXT.replace('Brooklyn', neighborhood);
    if (platform === 'instagram') {
      window.open(`https://www.instagram.com/`, '_blank');
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
        '_blank'
      );
    }
    recordShare();
  };

  return (
    <div
      className={`rounded-2xl border border-black/10 bg-white overflow-hidden shadow-lg ${className}`}
      id={`flyer-${completionId}`}
    >
      <div className="p-5 bg-gradient-to-b from-[#F8F8F8] to-white">
        <div className="text-center mb-4">
          <p className="text-sm font-semibold text-emerald-600">Job Completed ✔</p>
          <p className="text-lg font-bold text-[#111] mt-1">
            {serviceType} by {proName}
          </p>
          <p className="text-sm text-[#6A6A6A]">{neighborhood}</p>
          <p className="text-amber-600 mt-2">{stars}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {beforePhotoUrls.slice(0, 2).map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#F5F5F5]">
              <Image src={url} alt={`Before ${i + 1}`} fill className="object-cover" sizes="150px" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">Before</span>
            </div>
          ))}
          {afterPhotoUrls.slice(0, 2).map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#F5F5F5]">
              <Image src={url} alt={`After ${i + 1}`} fill className="object-cover" sizes="150px" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">After</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-[#6A6A6A] mb-4">via Flyers Up</p>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => handleShare('instagram')}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-black/10 hover:bg-[#F5F5F5]"
          >
            Share to Instagram
          </button>
          <button
            type="button"
            onClick={() => handleShare('facebook')}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-black/10 hover:bg-[#F5F5F5]"
          >
            Share to Facebook
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-black/10 hover:bg-[#F5F5F5]"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
