'use client';

/**
 * Quote card for price negotiation in booking chat.
 * Shows price, optional message, and action buttons (Accept / Counter).
 * Mobile-first, Flyers Up theme.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export type QuoteCardProps = {
  id: string;
  amount: number;
  message: string | null;
  senderRole: 'customer' | 'pro';
  action: 'proposed' | 'countered' | 'accepted' | 'declined';
  round: number;
  createdAt: string;
  /** Current user is customer */
  isCustomer: boolean;
  /** Can show Accept/Counter (negotiation not concluded) */
  canRespond: boolean;
  /** Max rounds reached */
  maxRoundsReached: boolean;
  onAccept?: () => Promise<void>;
  onCounter?: (amount: number, message?: string) => Promise<void>;
  /** Pro sends new quote after customer countered */
  onSendQuote?: (amount: number, message?: string) => Promise<void>;
  /** Other party name for display */
  otherPartyName: string;
};

export function QuoteCard({
  id,
  amount,
  message,
  senderRole,
  action,
  round,
  createdAt,
  isCustomer,
  canRespond,
  maxRoundsReached,
  onAccept,
  onCounter,
  onSendQuote,
  otherPartyName,
}: QuoteCardProps) {
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);

  const fromPro = senderRole === 'pro';
  const isAccepted = action === 'accepted';
  const isDeclined = action === 'declined';

  const handleAccept = async () => {
    if (!onAccept) return;
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  };

  const handleCounterOrQuote = async () => {
    const amt = parseFloat(counterAmount);
    if (!Number.isFinite(amt) || amt < 0) return;
    const fn = onCounter ?? onSendQuote;
    if (!fn) return;
    setLoading(true);
    try {
      await fn(amt, counterMessage.trim() || undefined);
      setShowCounterForm(false);
      setCounterAmount('');
      setCounterMessage('');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = fromPro
    ? 'bg-amber-50 border-amber-200'
    : 'bg-[#e8f5e5] border-[#9ae88d]';
  const label = fromPro ? otherPartyName : 'You';

  return (
    <div
      key={id}
      className={`rounded-xl border px-4 py-3 max-w-[85%] ${cardBg}`}
      style={{
        marginLeft: fromPro ? 0 : 'auto',
        marginRight: fromPro ? 'auto' : 0,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-xs text-muted">
          {new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
      <div className="mt-1">
        <span className="text-lg font-bold text-[#111]">${Number(amount).toFixed(2)}</span>
        {round > 1 && (
          <span className="ml-2 text-xs text-muted">Round {round}</span>
        )}
      </div>
      {message && (
        <p className="mt-2 text-sm text-[#333]">{message}</p>
      )}
      {isAccepted && (
        <p className="mt-2 text-sm font-medium text-green-700">✓ Accepted</p>
      )}
      {isDeclined && (
        <p className="mt-2 text-sm text-muted">Declined</p>
      )}

      {canRespond && !isAccepted && !isDeclined && !maxRoundsReached && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isCustomer && fromPro && onAccept && (
            <Button
              onClick={handleAccept}
              disabled={loading}
              showArrow={false}
              className="px-4 py-2 text-sm bg-[#B2FBA5] text-black hover:opacity-90"
            >
              {loading ? '…' : 'Accept'}
            </Button>
          )}
          {((isCustomer && fromPro) || (!isCustomer && !fromPro)) && (onCounter || onSendQuote) && (
            <>
              {!showCounterForm ? (
                <Button
                  variant="secondary"
                  onClick={() => setShowCounterForm(true)}
                  disabled={loading}
                  showArrow={false}
                  className="px-4 py-2 text-sm"
                >
                  {isCustomer ? 'Counter' : 'Send quote'}
                </Button>
              ) : (
                <div className="w-full space-y-2 pt-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Your offer ($)"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Optional message"
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCounterOrQuote} disabled={loading} showArrow={false} className="px-4 py-2 text-sm">
                      Send
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowCounterForm(false)}
                      className="text-sm text-muted hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {maxRoundsReached && canRespond && !isAccepted && (
        <p className="mt-2 text-xs text-muted">Max rounds reached. Accept or message to continue.</p>
      )}
    </div>
  );
}
