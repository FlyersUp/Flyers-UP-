'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';

export default function CustomerConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="mb-2 block">CUSTOMER CONVERSATION</Label>
            <h1 className="text-2xl font-semibold text-text">Conversation</h1>
          </div>
          <Link href="/customer/messages" className="text-sm text-muted hover:text-text">
            Back to Messages →
          </Link>
        </div>

        <Card withRail>
          <p className="text-sm text-muted">
            Conversation ID: <span className="font-mono">{conversationId}</span>
          </p>
          <p className="text-text mt-3">
            Chat UI wiring is next. For now this page confirms navigation works and stays in Customer mode.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}

