'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { getOnboardingSteps } from '@/lib/guidance/onboarding-copy';
import {
  trackOnboardingViewed,
  trackOnboardingStepViewed,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
} from '@/lib/guidance/analytics';

interface OnboardingGuideProps {
  open: boolean;
  role: 'customer' | 'pro' | null;
  onComplete: () => void;
  onSkip: () => void;
  /** Manual replay from Settings – skip analytics for "completed" */
  isReplay?: boolean;
}

export function OnboardingGuide({
  open,
  role,
  onComplete,
  onSkip,
  isReplay = false,
}: OnboardingGuideProps) {
  const steps = getOnboardingSteps(role);
  const [stepIndex, setStepIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !isReplay) {
      trackOnboardingViewed();
    }
  }, [open, isReplay]);

  useEffect(() => {
    if (open && !isReplay) {
      trackOnboardingStepViewed(stepIndex);
    }
  }, [open, stepIndex, isReplay]);

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
        onSkip();
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
  }, [open, onSkip]);

  if (!open) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function handleNext() {
    if (isLast) {
      if (!isReplay) trackOnboardingCompleted();
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleSkip() {
    if (!isReplay) trackOnboardingSkipped();
    onSkip();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/15 dark:bg-black/50 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && handleSkip()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg bg-[#F5F5F5] dark:bg-[#171A20] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
        style={{
          maxHeight: '90vh',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
        aria-describedby="onboarding-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="onboarding-title"
              className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]"
            >
              {step.title}
            </h2>
            <button
              type="button"
              onClick={handleSkip}
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#1D2128] text-[#6A6A6A] dark:text-[#A1A8B3] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Skip"
            >
              <X size={18} />
            </button>
          </div>
          <p id="onboarding-desc" className="mt-3 text-sm text-[#3A3A3A] dark:text-[#A1A8B3] leading-relaxed">
            {step.body}
          </p>
        </div>

        <div className="px-6 space-y-3">
          <button
            type="button"
            onClick={handleNext}
            className="w-full h-12 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLast ? 'Get started' : 'Next'}
            {!isLast && <ChevronRight size={18} />}
          </button>
          {!isReplay && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-sm text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] transition-colors py-2"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
