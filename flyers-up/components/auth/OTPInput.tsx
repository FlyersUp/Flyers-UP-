'use client';

import { useCallback, useEffect, useRef } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
}

/**
 * 6-digit OTP input with auto-submit when complete.
 * Supports paste and numeric input only.
 */
export function OTPInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
  'aria-label': ariaLabel = '6-digit code',
  'aria-describedby': ariaDescribedby,
  className = '',
}: OTPInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const digits = value.replace(/\D/g, '').slice(0, length);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const next = raw.replace(/\D/g, '').slice(0, length);
      onChange(next);
      if (next.length === length && onComplete) {
        onComplete(next);
      }
    },
    [length, onChange, onComplete]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
      onChange(pasted);
      if (pasted.length === length && onComplete) {
        onComplete(pasted);
      }
    },
    [length, onChange, onComplete]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && digits.length === length && onComplete) {
        e.preventDefault();
        onComplete(digits);
      }
    },
    [digits, length, onComplete]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      value={digits}
      onChange={handleChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      placeholder="000000"
      maxLength={length}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      className={`w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-center text-xl tracking-[0.4em] text-text placeholder:text-muted/50 placeholder:tracking-normal outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors disabled:opacity-50 ${className}`}
    />
  );
}
