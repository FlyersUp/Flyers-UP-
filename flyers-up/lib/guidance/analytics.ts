/**
 * Guidance analytics events. Wire to your analytics provider.
 */

export type GuidanceEvent =
  | { type: 'onboarding_viewed'; payload?: Record<string, unknown> }
  | { type: 'onboarding_step_viewed'; payload: { step: number } }
  | { type: 'onboarding_completed'; payload?: Record<string, unknown> }
  | { type: 'onboarding_skipped'; payload?: Record<string, unknown> }
  | { type: 'app_guide_replayed'; payload?: Record<string, unknown> }
  | { type: 'contextual_hint_viewed'; payload: { hintKey: string } }
  | { type: 'contextual_hint_dismissed'; payload: { hintKey: string } };

function emit(event: GuidanceEvent): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.debug('[GuidanceAnalytics]', event.type, event);
  }
  // TODO: Integrate with analytics provider
  // e.g. posthog?.capture(event.type, event.payload);
}

export function trackOnboardingViewed(): void {
  emit({ type: 'onboarding_viewed' });
}

export function trackOnboardingStepViewed(step: number): void {
  emit({ type: 'onboarding_step_viewed', payload: { step } });
}

export function trackOnboardingCompleted(): void {
  emit({ type: 'onboarding_completed' });
}

export function trackOnboardingSkipped(): void {
  emit({ type: 'onboarding_skipped' });
}

export function trackAppGuideReplayed(): void {
  emit({ type: 'app_guide_replayed' });
}

export function trackContextualHintViewed(hintKey: string): void {
  emit({ type: 'contextual_hint_viewed', payload: { hintKey } });
}

export function trackContextualHintDismissed(hintKey: string): void {
  emit({ type: 'contextual_hint_dismissed', payload: { hintKey } });
}
