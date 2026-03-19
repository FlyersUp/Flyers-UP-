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
    <div className="sticky bottom-0 flex items-center gap-2 border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-3 safe-area-pb">
      {showAttachmentPlaceholder && (
        <button
          type="button"
          disabled
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-black/15 dark:border-white/10 text-[#8A8A8A] dark:text-[#7A8490] cursor-not-allowed"
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
        className="flex-1 h-11 rounded-xl border border-black/10 dark:border-white/10 bg-[#F7F6F4] dark:bg-[#1D2128] px-4 text-sm text-[#111111] dark:text-[#F5F7FA] placeholder:text-[#8A8A8A] dark:placeholder:text-[#7A8490] focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:border-transparent disabled:opacity-60"
        aria-label="Message input"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#058954] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#047a48] transition-colors focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:ring-offset-2"
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
