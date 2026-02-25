'use client';

import ProProfileCard from '@/components/pro/ProProfileCard';
import type { ProProfilePro } from '@/components/pro/ProProfileCard';
import { FlyerFiltersBar } from './FlyerFiltersBar';

interface FlyerWallProps {
  pros: ProProfilePro[];
  categoryName: string;
  getBookHref: (proId: string) => string;
  getMessageHref: (proId: string) => string;
}

export function FlyerWall({ pros, categoryName, getBookHref, getMessageHref }: FlyerWallProps) {
  return (
    <div className="min-h-[40vh] bg-[#EAE8E6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <FlyerFiltersBar count={pros.length} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {pros.map((pro) => (
            <ProProfileCard
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
