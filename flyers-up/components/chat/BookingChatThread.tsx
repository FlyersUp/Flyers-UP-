'use client';

/**
 * Unified chat thread: messages + quote cards interleaved by created_at.
 * Used by both customer and pro chat pages.
 */
import { QuoteCard } from './QuoteCard';

export type ChatMessage = {
  id: string;
  type: 'message';
  sender_role: string;
  message: string;
  created_at: string;
};

export type ChatQuote = {
  id: string;
  type: 'quote';
  sender_role: 'customer' | 'pro';
  amount: number;
  message: string | null;
  action: string;
  round: number;
  created_at: string;
};

export type ChatItem = ChatMessage | ChatQuote;

function isQuote(item: ChatItem): item is ChatQuote {
  return item.type === 'quote';
}

export type BookingChatThreadProps = {
  items: ChatItem[];
  isCustomer: boolean;
  otherPartyName: string;
  priceStatus: string;
  negotiationRound: number;
  maxRounds?: number;
  onAcceptQuote?: () => Promise<void>;
  onCounter?: (amount: number, message?: string) => Promise<void>;
  onSendQuote?: (amount: number, message?: string) => Promise<void>;
  bookingId: string;
};

export function BookingChatThread({
  items,
  isCustomer,
  otherPartyName,
  priceStatus,
  negotiationRound,
  maxRounds = 2,
  onAcceptQuote,
  onCounter,
  onSendQuote,
  bookingId,
}: BookingChatThreadProps) {
  const canRespond =
    priceStatus === 'quoted' || priceStatus === 'countered';
  const maxRoundsReached = negotiationRound >= maxRounds;

  return (
    <div className="space-y-4">
      {items.map((item) => {
        if (isQuote(item)) {
          const canRespondToThis =
            canRespond &&
            !maxRoundsReached &&
            (item.action === 'proposed' || item.action === 'countered') &&
            ((isCustomer && item.sender_role === 'pro') || (!isCustomer && item.sender_role === 'customer'));

          return (
            <div
              key={`quote-${item.id}`}
              className={item.sender_role === 'pro' ? 'flex flex-col items-start' : 'flex flex-col items-end'}
            >
              <QuoteCard
                id={item.id}
                amount={item.amount}
                message={item.message}
                senderRole={item.sender_role}
                action={item.action as 'proposed' | 'countered' | 'accepted' | 'declined'}
                round={item.round}
                createdAt={item.created_at}
                isCustomer={isCustomer}
                canRespond={canRespondToThis}
                maxRoundsReached={maxRoundsReached}
                onAccept={
                  isCustomer && item.sender_role === 'pro' && onAcceptQuote
                    ? onAcceptQuote
                    : undefined
                }
                onCounter={isCustomer ? onCounter : undefined}
                onSendQuote={!isCustomer ? onSendQuote : undefined}
                otherPartyName={otherPartyName}
              />
            </div>
          );
        }

        const msg = item as ChatMessage;
        const mine =
          (isCustomer && msg.sender_role === 'customer') ||
          (!isCustomer && msg.sender_role === 'pro');
        const bubbleStyle =
          msg.sender_role === 'customer'
            ? 'bg-[#b2fba5] text-gray-900 border border-[#9ae88d]'
            : 'bg-amber-100 text-gray-900 border border-amber-200';
        const senderName = mine ? 'You' : otherPartyName;

        return (
          <div
            key={`msg-${msg.id}`}
            className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
          >
            <span className="text-xs font-medium text-muted mb-0.5">{senderName}</span>
            <div className={`max-w-xs rounded-xl px-4 py-2 ${bubbleStyle}`}>
              <p>{msg.message}</p>
              <div className="text-xs text-gray-600 mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
