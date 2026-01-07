'use client';

import { InputHTMLAttributes } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Text input with minimal borders and subtle accent
 */
export function Input({ label, error, className = '', ...props }: InputProps) {
  const { primaryColor } = useTheme();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${className}`}
        style={{
          borderTopColor: error ? '#ef4444' : primaryColor,
          borderTopWidth: '2px',
          ...(error && { borderColor: '#ef4444' }),
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}









