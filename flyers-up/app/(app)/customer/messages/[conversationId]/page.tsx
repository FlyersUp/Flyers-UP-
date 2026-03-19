'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect to canonical chat route. Do not maintain a third chat pattern.
 */
export default function CustomerMessagesConversationRedirect({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/customer/chat/conversation/${conversationId}`);
  }, [conversationId, router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-[#6A6A6A]">Redirecting…</p>
    </div>
  );
}
