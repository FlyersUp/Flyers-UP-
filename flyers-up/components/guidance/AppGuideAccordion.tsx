'use client';

import { useState } from 'react';
import {
  Compass,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Briefcase,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
export type AppGuideSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
};

const CUSTOMER_SECTIONS: AppGuideSection[] = [
  {
    id: 'getting-around',
    title: 'Getting around the app',
    icon: <Compass size={18} />,
    content:
      'Use the bottom nav: Home (dashboard), Explore (browse services), Messages, and Profile (settings). Bookings live under Home or from Explore when you book a pro.',
  },
  {
    id: 'booking',
    title: 'Booking flow',
    icon: <Briefcase size={18} />,
    content:
      'Browse pros, request a booking, pay a deposit once accepted, and pay the rest after the job is done. You can message the pro, reschedule, or cancel within policy.',
  },
  {
    id: 'deposits',
    title: 'Deposits and remaining payment',
    icon: <CreditCard size={18} />,
    content:
      'Deposit secures the booking. The remaining balance is charged after the pro marks the job complete. You can add payment methods in Settings → Payments.',
  },
  {
    id: 'messages',
    title: 'Messages and notifications',
    icon: <MessageCircle size={18} />,
    content:
      'Keep all communication in-app so everything is documented. Turn on push notifications to stay updated on booking changes.',
  },
  {
    id: 'cancellations',
    title: 'Cancellations, lateness, and support',
    icon: <HelpCircle size={18} />,
    content:
      'Cancellation policies depend on timing. If a pro is late or doesn’t show, you can report it. Contact support for disputes or help.',
  },
  {
    id: 'for-customers',
    title: 'Customer help',
    icon: <User size={18} />,
    content:
      'Save pros to favorites, manage addresses, and update your profile in Settings. Leave reviews after jobs to help the community.',
  },
];

const PRO_SECTIONS: AppGuideSection[] = [
  {
    id: 'getting-around',
    title: 'Getting around the app',
    icon: <Compass size={18} />,
    content:
      'Use the bottom nav: Home (dashboard), Jobs, Messages, and Profile. Jobs shows upcoming work and today’s schedule.',
  },
  {
    id: 'booking',
    title: 'Booking flow',
    icon: <Briefcase size={18} />,
    content:
      'Accept job requests, manage your schedule, update status (on the way, arrived, in progress), and mark complete. You get paid after the customer confirms.',
  },
  {
    id: 'deposits',
    title: 'Deposits and remaining payment',
    icon: <CreditCard size={18} />,
    content:
      'Set up payout in Settings. Deposits and remaining payments are released per policy. Earnings appear in your dashboard.',
  },
  {
    id: 'messages',
    title: 'Messages and notifications',
    icon: <MessageCircle size={18} />,
    content:
      'Keep communication in-app. Enable push so you don’t miss booking requests or updates.',
  },
  {
    id: 'cancellations',
    title: 'Cancellations, lateness, and support',
    icon: <HelpCircle size={18} />,
    content:
      'You can decline or cancel with policy. Report issues if a customer cancels last-minute. Contact support for disputes.',
  },
  {
    id: 'for-pros',
    title: 'Pro help',
    icon: <Briefcase size={18} />,
    content:
      'Update your availability, service area, and pricing in Settings. Build your reputation with completed jobs and reviews.',
  },
];

interface AppGuideAccordionProps {
  mode: 'customer' | 'pro';
  onReplayGuide?: () => void;
  onResetHints?: () => void;
  resetHintsLoading?: boolean;
}

export function AppGuideAccordion({
  mode,
  onReplayGuide,
  onResetHints,
  resetHintsLoading = false,
}: AppGuideAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sections = mode === 'pro' ? PRO_SECTIONS : CUSTOMER_SECTIONS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {onReplayGuide && (
          <button
            type="button"
            onClick={onReplayGuide}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-accent text-accentContrast hover:brightness-95 transition-colors"
          >
            Replay walkthrough
          </button>
        )}
        {onResetHints && (
          <button
            type="button"
            onClick={onResetHints}
            disabled={resetHintsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-border bg-surface hover:bg-hover transition-colors disabled:opacity-60"
          >
            {resetHintsLoading ? 'Resetting…' : 'Reset tips'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedId === section.id;
          return (
            <div
              key={section.id}
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-hover/50 transition-colors"
              >
                <span className="text-muted-foreground shrink-0">
                  {section.icon}
                </span>
                <span className="flex-1 font-medium text-foreground">
                  {section.title}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {isExpanded ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </span>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3.5 pt-0 border-t border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed pt-3">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
