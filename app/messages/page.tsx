'use client';

import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import PageLayout from '@/components/PageLayout';
import { getConversations } from '@/lib/mockData';
import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Messages Page - Message Board
 * Shows conversations for the current authenticated user (no mock auth users).
 */
export default function MessagesPage() {
  const { user, loading } = useCurrentUser();

  const userType = user?.role ?? 'customer';
  const userId = user?.id ?? null;

  const conversations = useMemo(() => {
    if (!userId) return [];
    // NOTE: mockData conversations are keyed to mock IDs, so this will be empty until real data exists.
    return getConversations(userId, userType);
  }, [userId, userType]);

  const dashboardLink = userType === 'customer' ? '/dashboard/customer' : '/dashboard/pro';

  if (loading) {
    return (
      <PageLayout showBackButton backButtonHref="/">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout showBackButton backButtonHref="/">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Messages</h1>
          <Label>MESSAGE BOARD</Label>
        </div>
        <Card withRail>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view messages</h3>
            <Link
              href="/signin"
              className="inline-flex mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </Card>
      </PageLayout>
    );
  }

  const getOtherPerson = (conv: (typeof conversations)[number]) => {
    return userType === 'customer'
      ? { name: conv.proName, avatar: conv.proAvatar }
      : { name: conv.customerName, avatar: conv.customerAvatar };
  };

  return (
    <PageLayout showBackButton backButtonHref={dashboardLink}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Messages</h1>
        <Label>MESSAGE BOARD</Label>
      </div>

      {conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const otherPerson = getOtherPerson(conv);
            return (
              <Link key={conv.id} href={`/messages/${conv.id}`}>
                <Card withRail className="hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {otherPerson.avatar && otherPerson.avatar.trim() !== '' ? (
                        <Image
                          src={otherPerson.avatar}
                          alt={otherPerson.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{otherPerson.name}</h3>
                        {conv.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {conv.lastMessageTime}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate flex-1">
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card withRail>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600">Your conversations will appear here.</p>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}





