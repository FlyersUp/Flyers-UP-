'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  return (
    <PageLayout className="pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Conversation</h1>
          <Link href="/messages" className="text-sm text-emerald-700 hover:text-emerald-800">
            Back to Messages
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">
            Conversation ID: <span className="font-mono">{conversationId}</span>
          </p>
          <p className="text-gray-700 mt-3">
            Chat UI wiring is next. For now this page confirms navigation works and won’t bounce you
            back to the dashboard.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}





