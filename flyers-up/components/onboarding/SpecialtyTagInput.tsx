'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSpecialtyPresets } from '@/lib/specialtyPresets';
import { X } from 'lucide-react';

const MAX_SPECIALTIES = 8;
const MAX_LABEL_LENGTH = 40;

interface SpecialtyTagInputProps {
  value: string[];
  onChange: (labels: string[]) => void;
  occupationSlug: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  /** Explains specialties vs services (shown under the label). */
  helperText?: string;
}

export function SpecialtyTagInput({
  value,
  onChange,
  occupationSlug,
  disabled = false,
  error,
  label = 'Specialties',
  helperText,
}: SpecialtyTagInputProps) {
  const [input, setInput] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const presets = getSpecialtyPresets(occupationSlug);

  const add = useCallback(
    (tagLabel: string) => {
      const trimmed = tagLabel.trim().slice(0, MAX_LABEL_LENGTH);
      if (!trimmed) return;
      const normalized = trimmed.toLowerCase();
      const exists = value.some((v) => v.toLowerCase() === normalized);
      if (exists) return;
      if (value.length >= MAX_SPECIALTIES) return;
      onChange([...value, trimmed]);
    },
    [value, onChange]
  );

  const remove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(input);
      setInput('');
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value.length - 1);
    }
  };

  const handleBlur = () => {
    if (input.trim()) add(input);
    setInput('');
    setTimeout(() => setShowPresets(false), 150);
  };

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setShowPresets(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text2">{label}</label>
      )}
      {helperText && <p className="text-sm text-muted mt-1 max-w-xl">{helperText}</p>}
      <div
        className={`min-h-[48px] rounded-xl border px-3 py-2 flex flex-wrap gap-2 items-center bg-surface ${
          error ? 'border-danger' : 'border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 text-text text-sm border border-accent/30"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-0.5 -mr-0.5 rounded hover:bg-accent/20"
                aria-label={`Remove ${v}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </span>
        ))}
        {value.length < MAX_SPECIALTIES && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_LABEL_LENGTH))}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowPresets(!!presets.length)}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={value.length === 0 ? 'Add a specialty…' : ''}
              className="w-full min-w-0 bg-transparent border-0 px-0 py-1 text-text placeholder:text-muted focus:outline-none focus:ring-0"
              maxLength={MAX_LABEL_LENGTH}
            />
            {showPresets && presets.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-black/10 dark:border-white/10 bg-[var(--surface-solid)] dark:bg-[#1f232a] shadow-xl shadow-black/10 py-1 max-h-40 overflow-y-auto">
                {presets
                  .filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()))
                  .slice(0, 10)
                  .map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        add(preset);
                        setShowPresets(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-text hover:bg-surface2"
                    >
                      {preset}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{value.length} / {MAX_SPECIALTIES} max</span>
        {error && <span className="text-danger">{error}</span>}
      </div>
    </div>
  );
}
