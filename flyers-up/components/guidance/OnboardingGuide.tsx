'use client';

/**
 * Product tour modal (bottom sheet on mobile).
 *
 * Mobile Safari: portal to `document.body`, backdrop vs sheet `pointer-events` split, and no
 * transform-based enter animation on the panel (avoids broken hit-testing).
 *
 * Regression checklist: Next / Skip / Get started receive taps; backdrop tap dismisses (skip);
 * underlying UI is not clickable while open.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [open, onSkip, stepIndex]);

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

  const overlay = (
    <div
      className="fixed inset-0 z-[200] isolate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {/* Backdrop: own layer, receives taps outside the sheet */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close guide"
        className="absolute inset-0 z-0 bg-black/15 dark:bg-black/50 pointer-events-auto cursor-default border-0 p-0"
        onClick={handleSkip}
      />

      {/* Sheet positioning shell: does not capture hits except on the panel */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center sm:items-center">
        <div
          ref={panelRef}
          className="pointer-events-auto relative z-10 w-full max-w-lg bg-[#F5F5F5] dark:bg-[#171A20] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200"
          style={{
            maxHeight: 'min(90vh, calc(100dvh - env(safe-area-inset-top, 0px) - 1rem))',
          }}
          aria-describedby="onboarding-desc"
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
                className="pointer-events-auto shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#1D2128] text-[#6A6A6A] dark:text-[#A1A8B3] transition-colors hover:bg-black/5 dark:hover:bg-white/5 touch-manipulation"
                aria-label="Skip"
              >
                <X size={18} />
              </button>
            </div>
            <p
              id="onboarding-desc"
              className="mt-3 text-sm text-[#3A3A3A] dark:text-[#A1A8B3] leading-relaxed"
            >
              {step.body}
            </p>
          </div>

          <div
            className="px-6 space-y-3"
            style={{
              paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))',
            }}
          >
            <button
              type="button"
              onClick={handleNext}
              className="pointer-events-auto w-full h-12 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 touch-manipulation"
            >
              {isLast ? 'Get started' : 'Next'}
              {!isLast && <ChevronRight size={18} />}
            </button>
            {!isReplay && (
              <button
                type="button"
                onClick={handleSkip}
                className="pointer-events-auto w-full text-sm text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] transition-colors py-2 touch-manipulation"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(overlay, document.body);
}
