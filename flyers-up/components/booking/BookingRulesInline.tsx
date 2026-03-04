'use client';

/**
 * Condensed rules for inline display in booking/checkout flow.
 * Deposit timer, remaining payment timing, auto-confirm.
 */
import Link from 'next/link';
import { Clock, CreditCard, CheckCircle2 } from 'lucide-react';

const RULES = [
  {
    icon: Clock,
    title: 'Deposit timer',
    text: 'Pay within 30 minutes after the Pro accepts, or the booking cancels.',
  },
  {
    icon: CreditCard,
    title: 'Remaining payment',
    text: 'Pay the remaining balance after the Pro marks the job complete.',
  },
  {
    icon: CheckCircle2,
    title: 'Auto-confirm',
    text: 'If you don\'t confirm within 24 hours (after remaining is paid), the system auto-confirms.',
  },
];

export function BookingRulesInline() {
  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm text-muted">
        {RULES.map((r, i) => (
          <li key={i} className="flex items-start gap-2">
            <r.icon size={16} className="shrink-0 mt-0.5 text-accent" strokeWidth={1.5} />
            <span>
              <strong className="text-text">{r.title}:</strong> {r.text}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/booking-rules"
        className="text-xs font-medium text-accent hover:underline"
      >
        Read full rules
      </Link>
    </div>
  );
}
