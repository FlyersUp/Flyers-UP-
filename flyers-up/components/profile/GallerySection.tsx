'use client';

/**
 * Gallery / Work Samples — Swiggy-style
 * Tabs (All, Before & After), 2-col grid, rounded corners, image count
 */

import { useMemo, useState } from 'react';
import type { ProWorkPhoto } from '@/lib/profileData';
import { PhotoModal } from '@/components/profile/PhotoModal';

type GalleryTab = 'all' | 'before_after';

function firstTag(photo: ProWorkPhoto): string | null {
  const t = Array.isArray((photo as any).tags) ? ((photo as any).tags as string[]) : [];
  return t.length ? t[0] : null;
}

function isBeforeAfter(photo: ProWorkPhoto): boolean {
  return 'beforeUrl' in photo && !!photo.beforeUrl && !!photo.afterUrl;
}

export function GallerySection({ photos }: { photos: ProWorkPhoto[] }) {
  const [activeTab, setActiveTab] = useState<GalleryTab>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const beforeAfterPhotos = useMemo(
    () => photos.filter((p) => isBeforeAfter(p)),
    [photos]
  );
  const displayPhotos = activeTab === 'before_after' ? beforeAfterPhotos : photos;
  const active = useMemo(
    () => photos.find((p) => p.id === activeId) ?? null,
    [activeId, photos]
  );

  const hasBeforeAfter = beforeAfterPhotos.length > 0;

  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] p-8 text-center shadow-sm shadow-black/5 dark:shadow-black/20">
        <p className="text-sm font-semibold text-[#111111] dark:text-[#F5F7FA]">
          No work photos yet
        </p>
        <p className="mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
          When photos are added, they’ll show here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden">
        <div className="border-b border-black/5 dark:border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#111111] dark:text-[#F5F7FA]">
                Gallery
              </h3>
              <p className="mt-0.5 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                {photos.length} {photos.length === 1 ? 'image' : 'images'}
              </p>
            </div>
          </div>

          {hasBeforeAfter && (
            <div className="mt-4 flex gap-1 border-b border-black/5 dark:border-white/10 -mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`pb-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-[#111111] dark:text-[#F5F7FA] border-b-2 border-[var(--accent)]'
                    : 'text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('before_after')}
                className={`pb-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'before_after'
                    ? 'text-[#111111] dark:text-[#F5F7FA] border-b-2 border-[var(--accent)]'
                    : 'text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA]'
                }`}
              >
                Before & After
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {displayPhotos.map((p) => {
              const url = 'beforeUrl' in p && p.beforeUrl ? p.beforeUrl : p.imageUrl;
              const tag = firstTag(p);
              const isBA = isBeforeAfter(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  aria-label="Open photo"
                >
                  <img
                    src={url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  {tag ? (
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 dark:bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-[#111111] dark:text-[#F5F7FA] border border-black/5 dark:border-white/10">
                      {tag}
                    </span>
                  ) : null}
                  {isBA ? (
                    <span className="absolute right-2 top-2 rounded-full bg-white/95 dark:bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-[#111111] dark:text-[#F5F7FA] border border-black/5 dark:border-white/10">
                      Before/After
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PhotoModal open={Boolean(active)} photo={active} onClose={() => setActiveId(null)} />
    </>
  );
}
