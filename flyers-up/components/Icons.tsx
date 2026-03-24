/**
 * Shared custom SVG icons (marketing + UI).
 * How It Works: Request, Match, Message, Schedule — use with `className` for size/color (`text-blue-600`).
 */

type IconProps = {
  className?: string;
};

export function RequestIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function MatchIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
      <path d="M9 2H6a2 2 0 0 0-2 2v3a2 2 0 0 1 2 2 2 2 0 0 1-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 1 2 2 2 2 0 0 1 2-2h3a2 2 0 0 0 2-2V9a2 2 0 0 1-2-2 2 2 0 0 1 2-2V4a2 2 0 0 0-2-2h-3" />
    </svg>
  );
}

export function MessageIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="m9 10 2 2 4-4" />
    </svg>
  );
}

export function ScheduleIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M12 14v4" />
      <path d="M10 16h4" />
      {/* Small pin — time + place */}
      <path
        d="M19 17.5a1.35 1.35 0 1 0-2.7 0c0 1 1.35 2.7 1.35 2.7s1.35-1.7 1.35-2.7z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17.65" cy="17.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
