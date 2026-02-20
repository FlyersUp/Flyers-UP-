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
    : 'border-[var(--hairline)] focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)] focus:border-[var(--role-border)]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-[var(--radius-lg)] border bg-surface text-text placeholder:text-muted/70 focus:outline-none transition-all duration-[var(--transition-base)] ${fieldClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}












