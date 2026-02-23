'use client';

import { FlyerCard, type FlyerPro } from './FlyerCard';
import { FlyerFiltersBar } from './FlyerFiltersBar';

interface FlyerWallProps {
  pros: FlyerPro[];
  categoryName: string;
  getBookHref: (proId: string) => string;
  getMessageHref: (proId: string) => string;
}

export function FlyerWall({ pros, categoryName, getBookHref, getMessageHref }: FlyerWallProps) {
  return (
    <div className="relative">
      {/* Wooden post background - Option B: vertical post strip behind content */}
      <div className="wood-post-bg" aria-hidden />

      <div className="relative z-10">
        <FlyerFiltersBar count={pros.length} />

        {/* 2 cols on md+, 1 col on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {pros.map((pro) => (
            <FlyerCard
              key={pro.id}
              pro={pro}
              profileHref={`/customer/pros/${pro.id}`}
              bookHref={getBookHref(pro.id)}
              messageHref={getMessageHref(pro.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
