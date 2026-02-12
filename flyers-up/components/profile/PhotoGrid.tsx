'use client';

import { useMemo, useState } from 'react';
import type { ProWorkPhoto } from '@/lib/profileData';
import { PhotoModal } from '@/components/profile/PhotoModal';

function firstTag(photo: ProWorkPhoto): string | null {
  const t = Array.isArray((photo as any).tags) ? ((photo as any).tags as string[]) : [];
  return t.length ? t[0] : null;
}

export function PhotoGrid({ photos }: { photos: ProWorkPhoto[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => photos.find((p) => p.id === activeId) ?? null, [activeId, photos]);

  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="text-sm font-semibold">No work photos yet</div>
        <div className="mt-1 text-sm text-muted">When photos are added, they’ll show here.</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-[2px] rounded-2xl overflow-hidden border border-hairline bg-white shadow-sm">
        {photos.map((p) => {
          const url = 'beforeUrl' in p && p.beforeUrl ? p.beforeUrl : p.imageUrl;
          const tag = firstTag(p);
          const isBA = 'beforeUrl' in p && p.beforeUrl && p.afterUrl;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              className="relative aspect-square bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
              aria-label="Open photo"
            >
              <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              {tag ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-semibold border border-hairline">
                  {tag}
                </span>
              ) : null}
              {isBA ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-semibold border border-hairline">
                  Before/After
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <PhotoModal open={Boolean(active)} photo={active} onClose={() => setActiveId(null)} />
    </>
  );
}

