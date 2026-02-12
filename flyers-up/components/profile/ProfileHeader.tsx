import Image from 'next/image';
import { StatsRow, type StatItem } from '@/components/profile/StatsRow';

export type ProfileBadge = { label: string };

export function ProfileHeader({
  avatarUrl,
  fallbackIcon,
  name,
  badges,
  stats,
}: {
  avatarUrl: string | null;
  fallbackIcon?: string;
  name: string;
  badges: ProfileBadge[];
  stats: StatItem[];
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="h-[72px] w-[72px] rounded-full overflow-hidden bg-white border border-hairline shadow-sm flex items-center justify-center">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={72} height={72} className="h-[72px] w-[72px] object-cover" />
          ) : (
            <span className="text-2xl" aria-hidden>
              {fallbackIcon ?? '👤'}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[19px] sm:text-[22px] font-bold leading-tight tracking-tight">{name}</div>

        {badges.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide bg-white border border-hairline shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          <StatsRow items={stats} />
        </div>
      </div>
    </div>
  );
}

