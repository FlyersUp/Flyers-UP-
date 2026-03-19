'use client';

import { useRef, useEffect } from 'react';

export interface ConversationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  /** Optional: show attachment placeholder */
  showAttachmentPlaceholder?: boolean;
}

export function ConversationInput({
  value,
  onChange,
  onSend,
  placeholder = 'Message your pro…',
  disabled = false,
  sending = false,
  showAttachmentPlaceholder = false,
}: ConversationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !sending) {
      inputRef.current?.focus();
    }
  }, [disabled, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !sending && !disabled;

  return (
    <div className="safe-area-pb sticky bottom-0 flex items-center gap-2 border-t border-border bg-surface p-3">
      {showAttachmentPlaceholder && (
        <button
          type="button"
          disabled
          className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-dashed border-border text-muted"
          aria-label="Attach (coming soon)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-primary placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[hsl(var(--success)/0.5)] disabled:opacity-60"
        aria-label="Message input"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-hover focus:outline-none focus:ring-2 focus:ring-[hsl(var(--success)/0.5)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={sending ? 'Sending…' : 'Send message'}
      >
        {sending ? (
          <span className="text-xs font-medium">…</span>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
}
