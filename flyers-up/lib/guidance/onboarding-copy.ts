/**
 * Onboarding steps copy. Role-aware, minimal—2 steps max.
 * Uses live nav labels from nav-labels.ts.
 */

import { NAV_LABELS } from './nav-labels';

export type OnboardingStepId = 'welcome' | 'key-thing';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string;
};

export function getOnboardingSteps(role: 'customer' | 'pro' | null): OnboardingStep[] {
  const navList =
    role === 'pro'
      ? `${NAV_LABELS.pro.home}, ${NAV_LABELS.pro.jobs}, and ${NAV_LABELS.pro.messages}`
      : `${NAV_LABELS.customer.home}, ${NAV_LABELS.customer.explore}, and ${NAV_LABELS.customer.messages}`;

  const step2 =
    role === 'pro'
      ? {
          id: 'key-thing' as const,
          title: 'How it works',
          body: `Accept jobs, complete the work, and get paid smoothly. Use ${navList} to manage everything.`,
        }
      : {
          id: 'key-thing' as const,
          title: 'How it works',
          body: `Book a pro, pay a deposit, and pay the rest when the job is done. Use ${navList} to manage everything.`,
        };

  return [
    {
      id: 'welcome',
      title: 'Welcome to Flyers Up',
      body: 'Book trusted local help, track your job, and stay updated every step of the way.',
    },
    step2,
  ];
}
