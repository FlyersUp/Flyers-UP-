'use client';

import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getMessages, getConversations, type Message } from '@/lib/mockData';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Conversation Detail Page
 * Shows messages in a conversation between customer and pro.
 * No mock auth users; requires a real session to view.
 */
export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { user, loading } = useCurrentUser();

  const userType = user?.role ?? 'customer';
  const userId = user?.id ?? null;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialMessages = getMessages(conversationId);
    setMessages(initialMessages);
  }, [conversationId]);

  const conversations = useMemo(() => {
    if (!userId) return [];
    return getConversations(userId, userType);
  }, [userId, userType]);

  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !userId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: userId,
      senderName: 'You',
      senderType: userType,
      content: message.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card withRail>
          <div className="text-center py-12 text-gray-500">Loading...</div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card withRail>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view messages</h3>
            <Link href="/signin">
              <Button variant="primary" className="mt-4">
                Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card withRail>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Conversation not found</h3>
            <p className="text-gray-600">This demo view uses mock data keyed to mock IDs.</p>
            <Link href="/messages">
              <Button variant="secondary" className="mt-4">
                Back to Messages
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const otherPerson =
    userType === 'customer'
      ? { name: conversation.proName, avatar: conversation.proAvatar }
      : { name: conversation.customerName, avatar: conversation.customerAvatar };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4">
        <Link href="/messages" className="text-gray-600 hover:text-gray-900">
          ← Back to Messages
        </Link>
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {otherPerson.avatar && otherPerson.avatar.trim() !== '' ? (
            <Image
              src={otherPerson.avatar}
              alt={otherPerson.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{otherPerson.name}</div>
          {conversation.bookingId && (
            <Badge variant="verified" className="text-xs">
              Booking #{conversation.bookingId}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length > 0 ? (
          <>
            {messages.map((msg: Message) => {
              const isOwnMessage = msg.senderType === userType;
              return (
                <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-xl px-4 py-2 ${
                      isOwnMessage
                        ? userType === 'customer'
                          ? 'bg-[#A8E6CF] text-gray-900'
                          : 'bg-[#FFD3A1] text-gray-900'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-600">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!message.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}





