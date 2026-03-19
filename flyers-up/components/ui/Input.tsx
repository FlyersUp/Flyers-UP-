'use client';

import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Text input with minimal borders and subtle accent
 */
export function Input({ label, error, className = '', ...props }: InputProps) {
  const fieldClasses = error
    ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
    : 'border-border bg-surface focus:ring-2 focus:ring-[var(--ring-green)] focus:border-borderStrong';

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text2">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-[var(--radius-lg)] border px-4 py-3 text-text placeholder:text-text3/85 shadow-[var(--shadow-1)] focus:outline-none transition-all duration-[var(--transition-base)] ${fieldClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger/95">{error}</p>
      )}
    </div>
  );
}












