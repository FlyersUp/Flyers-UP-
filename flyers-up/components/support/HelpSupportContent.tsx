'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TrustRow } from '@/components/ui/TrustRow';
import { OFFICIAL_SUPPORT_EMAIL_DISPLAY } from '@/lib/support/official-contact';
import { PublicSupportContactSection } from '@/components/support/PublicSupportContactSection';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I book a pro?',
    answer:
      'Browse available service professionals on the marketplace, view their profiles and reviews, then click "Book This Pro" to select a date and time. The pro will receive your booking request and can accept or decline it.',
  },
  {
    question: 'How do I get paid? (For Pros)',
    answer:
      'Once you complete a job and mark it as completed, earnings are automatically tracked. You can set up your payout method in Payment Settings to receive payments via bank account, PayPal, or CashApp.',
  },
  {
    question: 'What if something goes wrong?',
    answer:
      'For account or platform help, signed-in users can submit a support ticket from this page (or from Help in settings). For booking-specific problems, use the tools on your booking where available. For safety or harassment involving another member, sign in and use Report from chat or their profile — that is separate from general support. You can also email the address below; we do not guarantee response times.',
  },
  {
    question: 'Can I cancel a booking?',
    answer:
      'Yes, both customers and pros can cancel bookings. Customers can cancel before the pro accepts. Once accepted, cancellation policies apply. Please check the booking details for specific cancellation terms.',
  },
  {
    question: 'How are ratings and reviews handled?',
    answer:
      'After a job is completed, both customers and pros can leave ratings and reviews. These help build trust in the community and help others make informed decisions.',
  },
];

export function HelpSupportContent() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  function toggleFAQ(index: number) {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">Help & Support</h1>
        <p className="text-muted">Find answers to common questions and get support</p>
        <div className="mt-3">
          <TrustRow />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="border border-border rounded-lg bg-surface">
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface2 transition-colors"
              >
                <span className="font-medium text-text">{item.question}</span>
                <span className="text-muted/70">{expandedFAQ === index ? '−' : '+'}</span>
              </button>
              {expandedFAQ === index && (
                <div className="px-4 pb-3 pt-0 text-sm text-muted border-t border-border">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text mb-4">Contact support</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg space-y-4">
          <PublicSupportContactSection />
          <p className="text-xs text-muted border-t border-border pt-4">
            Email (all users):{' '}
            <a href={`mailto:${OFFICIAL_SUPPORT_EMAIL_DISPLAY}`} className="underline font-medium text-text">
              {OFFICIAL_SUPPORT_EMAIL_DISPLAY}
            </a>
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text mb-4">Terms & Policies</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg">
          <p className="text-sm text-muted mb-4">
            Review our terms of service, privacy policy, and community guidelines.
          </p>
          <div className="space-y-2">
            <Link
              href="/legal/terms"
              className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text hover:bg-surface2 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal/privacy"
              className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text hover:bg-surface2 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/guidelines"
              className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text hover:bg-surface2 transition-colors"
            >
              Community Guidelines
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
