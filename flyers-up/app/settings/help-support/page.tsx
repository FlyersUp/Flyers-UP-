'use client';

/**
 * Help & Support Page
 * Provides FAQ, support contact, and terms links
 */

import { useState } from 'react';
import { TrustRow } from '@/components/ui/TrustRow';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I book a pro?',
    answer: 'Browse available service professionals on the marketplace, view their profiles and reviews, then click "Book This Pro" to select a date and time. The pro will receive your booking request and can accept or decline it.',
  },
  {
    question: 'How do I get paid? (For Pros)',
    answer: 'Once you complete a job and mark it as completed, earnings are automatically tracked. You can set up your payout method in Payment Settings to receive payments via bank account, PayPal, or CashApp.',
  },
  {
    question: 'What if something goes wrong?',
    answer: 'If you encounter any issues with a booking or service, please contact our support team immediately. We\'re here to help resolve any disputes and ensure a positive experience for both customers and pros.',
  },
  {
    question: 'Can I cancel a booking?',
    answer: 'Yes, both customers and pros can cancel bookings. Customers can cancel before the pro accepts. Once accepted, cancellation policies apply. Please check the booking details for specific cancellation terms.',
  },
  {
    question: 'How are ratings and reviews handled?',
    answer: 'After a job is completed, both customers and pros can leave ratings and reviews. These help build trust in the community and help others make informed decisions.',
  },
];

export default function HelpSupportPage() {
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

      {/* FAQ Section */}
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
                <span className="text-muted/70">
                  {expandedFAQ === index ? '−' : '+'}
                </span>
              </button>
              {expandedFAQ === index && (
                <div className="px-4 pb-3 pt-0 text-sm text-muted border-t border-border">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text mb-4">Contact Support</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg">
          <p className="text-sm text-muted mb-4">
            Need help? Our support team is here to assist you. Send us an email and we&apos;ll get back to you as soon as possible.
          </p>
          <a
            href="mailto:hello.flyersup@gmail.com?subject=Support Request"
            className="inline-block px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>

      {/* Terms & Policies */}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text mb-4">Terms & Policies</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg">
          <p className="text-sm text-muted mb-4">
            Review our terms of service, privacy policy, and community guidelines.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-sm text-muted cursor-not-allowed"
            >
              Terms of Service (Coming Soon)
            </button>
            <button
              type="button"
              disabled
              className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-sm text-muted cursor-not-allowed"
            >
              Privacy Policy (Coming Soon)
            </button>
            <button
              type="button"
              disabled
              className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-sm text-muted cursor-not-allowed"
            >
              Community Guidelines (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

