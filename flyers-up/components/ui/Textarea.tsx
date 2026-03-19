'use client';

import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  const fieldClasses = error
    ? 'border-danger focus:ring-danger/25 focus:border-danger'
    : 'border-border bg-surface focus:ring-[var(--ring-green)] focus:border-borderStrong';

  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium text-text2">{label}</label>}
      <textarea
        className={`w-full resize-none rounded-[var(--radius-lg)] border px-4 py-3 text-text placeholder:text-text3/85 shadow-[var(--shadow-1)] focus:outline-none focus:ring-2 transition-all ${fieldClasses} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger/95">{error}</p>}
    </div>
  );
}

