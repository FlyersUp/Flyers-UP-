'use client';

import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  const fieldClasses = error
    ? 'border-danger border-t-danger focus:ring-danger/30 focus:border-danger'
    : 'border-border border-t-accent focus:ring-accent/30 focus:border-accent';

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-muted mb-1.5">{label}</label>}
      <textarea
        className={`w-full px-4 py-3 rounded-xl border border-t-2 bg-surface text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all resize-none ${fieldClasses} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

