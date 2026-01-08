'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { mockServicePros, getConversationId } from '@/lib/mockData';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Service Pro Profile
 * Pro details, services, reviews, booking CTA
 *
 * Note: This page uses mock pro data, but does NOT fabricate/mock an authenticated user.
 */
export default function ProProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pro = mockServicePros.find((p) => p.id === id);
  const { user } = useCurrentUser();
  const [conversationId, setConversationId] = useState<string>('');

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      setConversationId('');
      return;
    }
    setConversationId(getConversationId(user.id, id));
  }, [id, user]);

  if (!pro) {
    return <div>Pro not found</div>;
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/customer/home" className="text-sm text-gray-600 mb-4 inline-block">
          ← Back
        </Link>

        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          <div className="flex gap-6">
            <div className="w-24 h-24 rounded-xl bg-gray-200 flex-shrink-0 flex items-center justify-center text-4xl">
              👤
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">{pro.name}</h1>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{pro.rating}</span>
                <span className="text-gray-500">({pro.reviewCount} reviews)</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {pro.badges.map((badge, i) => (
                  <Badge key={i} variant="highlight">
                    {badge}
                  </Badge>
                ))}
              </div>
              <div className="text-2xl font-bold text-gray-900">From ${pro.startingPrice}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <Label className="mb-4 block">ABOUT</Label>
            <p className="text-gray-700">{pro.bio}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <Label className="mb-4 block">SERVICES</Label>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span>Standard Clean</span>
                <span className="font-semibold">$75</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span>Deep Clean</span>
                <span className="font-semibold">$150</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Move-Out Clean</span>
                <span className="font-semibold">$200</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <Label className="mb-4 block">REVIEWS</Label>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">John D.</span>
                  <span className="text-yellow-500">★★★★★</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Excellent service! Very thorough and professional.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Link href={`/customer/booking/service?proId=${id}`}>
            <Button className="w-full">BOOK THIS PRO →</Button>
          </Link>
          {user ? (
            <Link href={conversationId ? `/messages/${conversationId}` : '/messages'}>
              <Button variant="secondary" className="w-full">
                💬 MESSAGE PRO →
              </Button>
            </Link>
          ) : (
            <Link href="/signin?role=customer">
              <Button variant="secondary" className="w-full">
                Sign in to message →
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
}





