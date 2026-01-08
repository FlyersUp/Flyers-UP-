'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

const mockThreads = [
  { id: '1', name: 'Support', last: 'How can we help?', time: 'Just now' },
  { id: '2', name: 'Sarah Johnson', last: 'See you at 10am.', time: '2h' },
  { id: '3', name: 'Mike Chen', last: 'I can come tomorrow.', time: '1d' },
];

export default function MessagesPage() {
  return (
    <PageLayout showBackButton={false} className="pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600 mb-6">Your conversations will show up here.</p>

        <div className="bg-white border border-gray-200 rounded-xl divide-y">
          {mockThreads.map((t) => (
            <Link
              key={t.id}
              href={`/messages/${t.id}`}
              className="block px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{t.last}</div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{t.time}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}





