'use client';

/**
 * Help & Support Page
 * Provides FAQ, support contact, and terms links
 */

import { useState } from 'react';

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Help & Support</h1>
        <p className="text-gray-600">Find answers to common questions and get support</p>
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{item.question}</span>
                <span className="text-gray-400">
                  {expandedFAQ === index ? '−' : '+'}
                </span>
              </button>
              {expandedFAQ === index && (
                <div className="px-4 pb-3 pt-0 text-sm text-gray-600 border-t border-gray-100">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h2>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            Need help? Our support team is here to assist you. Send us an email and we'll get back to you as soon as possible.
          </p>
          <a
            href="mailto:hello.flyersup@gmail.com?subject=Support Request"
            className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>

      {/* Terms & Policies */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Policies</h2>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            Review our terms of service, privacy policy, and community guidelines.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
            >
              Terms of Service (Coming Soon)
            </button>
            <button
              type="button"
              disabled
              className="block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
            >
              Privacy Policy (Coming Soon)
            </button>
            <button
              type="button"
              disabled
              className="block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
            >
              Community Guidelines (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

