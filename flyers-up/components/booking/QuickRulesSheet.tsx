'use client';

/**
 * One-time Quick Rules bottom sheet shown when customer starts first booking.
 * 3 bullets + "I understand" checkbox. Buttons: Continue, View full rules.
 * Only shown once per user (localStorage: has_seen_quick_rules).
 */
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

const STORAGE_KEY = 'has_seen_quick_rules';

export function hasSeenQuickRules(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function setHasSeenQuickRules(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
}

const BULLETS = [
  'After the Pro accepts, you have 30 minutes to pay the deposit or the booking cancels.',
  'You pay the remaining balance after the Pro marks the job complete.',
  "If you don't confirm within 24 hours (after remaining is paid), the system auto-confirms.",
];

interface QuickRulesSheetProps {
  open: boolean;
  onContinue: () => void;
  onClose: () => void;
}

export function QuickRulesSheet({ open, onContinue, onClose }: QuickRulesSheetProps) {
  const [understood, setUnderstood] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep focus inside panel when open
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleContinue = () => {
    setHasSeenQuickRules();
    setUnderstood(false);
    onContinue();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 dark:bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-rules-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg bg-[#F5F5F5] dark:bg-[#2A2A2E] rounded-t-2xl shadow-xl p-6 pb-[env(safe-area-inset-bottom)]"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="quick-rules-title" className="text-lg font-semibold text-[#111111] dark:text-[#F3F4F6] mb-6">
          Quick Rules
        </h2>
        <ul className="space-y-3 mb-6">
          {BULLETS.map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[#3A3A3A]">
              <span className="shrink-0 mt-0.5 text-accent">
                <Check size={18} strokeWidth={2.5} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-3 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#222225] cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-[#3A3A3A]">I understand</span>
        </label>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!understood}
            className="w-full h-12 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            Continue
          </button>
          <Link
            href="/booking-rules"
            onClick={onClose}
            className="w-full h-12 rounded-full text-sm font-medium text-[#6A6A6A] dark:text-[#A1A1AA] border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center"
          >
            View full rules
          </Link>
        </div>
      </div>
    </div>
  );
}
