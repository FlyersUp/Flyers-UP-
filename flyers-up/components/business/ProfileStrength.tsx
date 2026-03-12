'use client';

import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ProfileStrengthChecklist {
  businessName: boolean;
  occupation: boolean;
  startingPrice: boolean;
  profilePhoto: boolean;
  workPhotos: boolean;
  description: boolean;
  servicePackages: boolean;
}

export interface ProfileStrengthProps {
  checklist: ProfileStrengthChecklist;
  className?: string;
}

const ITEMS: { key: keyof ProfileStrengthChecklist; label: string }[] = [
  { key: 'businessName', label: 'Business name' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'startingPrice', label: 'Starting price' },
  { key: 'profilePhoto', label: 'Add profile photo' },
  { key: 'workPhotos', label: 'Add 3 work photos' },
  { key: 'description', label: 'Write description' },
  { key: 'servicePackages', label: 'Add service packages' },
];

export function ProfileStrength({ checklist, className }: ProfileStrengthProps) {
  const completed = ITEMS.filter(({ key }) => checklist[key]).length;
  const total = ITEMS.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className={cn(
        'bg-surface rounded-2xl border border-border shadow-sm p-4 md:p-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-sm font-semibold text-text">Profile Strength</h3>
        <span className="text-lg font-bold text-accent tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 bg-surface2 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="space-y-2">
        {ITEMS.map(({ key, label }) => {
          const done = checklist[key];
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              {done ? (
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              )}
              <span className={done ? 'text-text' : 'text-muted'}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
