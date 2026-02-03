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
    ? 'border-danger border-t-danger focus:ring-danger/30 focus:border-danger'
    : 'border-border border-t-accent focus:ring-accent/30 focus:border-accent';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl border border-t-2 bg-surface text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${fieldClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}












