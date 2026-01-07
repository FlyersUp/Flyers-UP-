'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { use, useState } from 'react';
import Link from 'next/link';

/**
 * Pro Chat - Screen 18
 * Chat interface styled in Pro mode (orange)
 */
export default function ProChat({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [message, setMessage] = useState('');

  const messages = [
    { id: '1', type: 'system', text: 'BOOKING CONFIRMED', time: '10:00 AM' },
    { id: '2', type: 'pro', text: 'Hi! I\'ll be arriving at 10 AM sharp. See you soon!', time: '10:05 AM' },
    { id: '3', type: 'customer', text: 'Perfect, thanks!', time: '10:10 AM' },
    { id: '4', type: 'system', text: 'JOB STARTED', time: '10:15 AM' },
  ];

  return (
    <AppLayout mode="pro">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4">
          <Link href="/messages" className="text-gray-600 hover:text-gray-900">
            ←
          </Link>
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            👤
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">John Doe</div>
            <Badge variant="highlight">IN PROGRESS</Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center">
                  <Label className="bg-gray-100">{msg.text}</Label>
                  <div className="text-xs text-gray-500 mt-1">{msg.time}</div>
                </div>
              );
            }
            return (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'pro' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-xl px-4 py-2 ${
                    msg.type === 'pro'
                      ? 'bg-[#FFD3A1] text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p>{msg.text}</p>
                  <div className="text-xs text-gray-500 mt-1">{msg.time}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setMessage('')}>Send</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

