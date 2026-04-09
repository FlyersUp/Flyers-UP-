'use client';

/**
 * Pro Conversation Chat - messaging with customer without a booking.
 */
import { AppLayout } from '@/components/layouts/AppLayout';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/messages/EmptyState';
import { Button } from '@/components/ui/Button';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { ReportUserBlockUser } from '@/components/moderation/ReportUserBlockUser';
import { useYouBlockedOtherUser } from '@/hooks/useYouBlockedOtherUser';
import { YouBlockedUserBanner } from '@/components/moderation/YouBlockedUserBanner';

export default function ProConversationChat({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  useConversationPresence(conversationId);
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState<Array<{ id: string; sender_role: string; message: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>('Customer');
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);
  const [sendHint, setSendHint] = useState<string | null>(null);
  const { clearMessagesAlert, clearNotificationsAlert } = useNavAlerts();
  const { youBlocked, loading: blockLoading, unblock } = useYouBlockedOtherUser(customerUserId);

  useEffect(() => {
    clearMessagesAlert();
    clearNotificationsAlert();
  }, [clearMessagesAlert, clearNotificationsAlert]);

  async function load() {
    setLoading(true);
    const { data: conv } = await supabase
      .from('conversations')
      .select('customer_id')
      .eq('id', conversationId)
      .maybeSingle();
    const custId = (conv as { customer_id?: string })?.customer_id;
    setCustomerUserId(custId ?? null);
    if (custId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, email')
        .eq('id', custId)
        .maybeSingle();
      const p = profile as { first_name?: string | null; last_name?: string | null; full_name?: string | null; email?: string | null } | null;
      const name = p?.full_name?.trim()
        || [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(' ')
        || (p?.email ? (p.email.split('@')[0] || p.email) : null);
      setCustomerName(name?.trim() || 'Customer');
    }

    const { data } = await supabase
      .from('conversation_messages')
      .select('id, sender_role, message, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setRows((data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [conversationId]);

  return (
    <AppLayout mode="pro">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        <div className="bg-surface border-b border-[var(--surface-border)] px-4 py-4 flex items-center gap-4">
          <Link href="/pro/messages" className="text-muted hover:text-text">
            ←
          </Link>
          <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center">
            <span className="text-muted">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text truncate">{customerName}</div>
            <span className="text-xs text-muted">Inquiry – questions only, no booking yet</span>
          </div>
          {customerUserId ? (
            <ReportUserBlockUser
              targetUserId={customerUserId}
              targetDisplayName={customerName}
              variant="menu"
            />
          ) : null}
        </div>

        <YouBlockedUserBanner
          youBlocked={youBlocked}
          loading={blockLoading}
          onUnblock={unblock}
          partyLabel="this customer"
        />

        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-surface2 border border-[var(--surface-border)] text-sm text-muted">
          Customer is asking questions. They can start a booking when they&apos;re ready.
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-[#F5F5F5]">
          {loading ? (
            <p className="text-sm text-muted/70">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              variant="thread"
              title="No messages yet"
              subtitle="Send a message to respond to the customer's inquiry."
              ctaLabel="Send message"
              ctaDisabled
              ctaTooltip="Use the input below to send a message"
            />
          ) : (
            rows.map((msg) => {
              const mine = msg.sender_role === 'pro';
              const isPro = msg.sender_role === 'pro';
              const bubbleStyle = isPro
                ? 'bg-amber-100 text-gray-900 border border-amber-200'
                : 'bg-[#b2fba5] text-gray-900 border border-[#9ae88d]';
              const senderName = isPro ? 'You' : customerName;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-xs font-medium text-muted mb-0.5">{senderName}</span>
                  <div className={`max-w-xs rounded-xl px-4 py-2 ${bubbleStyle}`}>
                    <p>{msg.message}</p>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {sendHint ? (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-sm text-amber-900">{sendHint}</div>
        ) : null}

        <div className="bg-surface border-t border-[var(--surface-border)] px-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
              disabled={youBlocked}
            />
            <Button
              onClick={async () => {
                const text = message.trim();
                if (!text || youBlocked) return;
                setSendHint(null);
                const res = await fetch(`/api/conversations/${conversationId}/messages`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: text }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  setSendHint(typeof data?.error === 'string' ? data.error : 'Could not send message');
                  return;
                }
                setMessage('');
                await load();
              }}
              disabled={youBlocked}
              showArrow={false}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
