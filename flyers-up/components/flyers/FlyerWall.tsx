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
    <div
      className="min-h-[40vh] bg-[#FAF8F6]"
      style={{
        background: 'radial-gradient(circle at top, rgba(0,0,0,0.03), transparent 55%), #FAF8F6',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <FlyerFiltersBar count={pros.length} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
