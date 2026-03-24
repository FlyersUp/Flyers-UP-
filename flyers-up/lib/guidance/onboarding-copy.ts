/**
 * Onboarding steps copy. Role-aware, minimal—2 steps max.
 */

export type OnboardingStepId = 'welcome' | 'key-thing';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string;
};

export function getOnboardingSteps(role: 'customer' | 'pro' | null): OnboardingStep[] {
  const step2 =
    role === 'pro'
      ? {
          id: 'key-thing' as const,
          title: 'How it works',
          body: 'Accept jobs, complete the work, get paid. Home, Jobs, and Messages have everything you need.',
        }
      : {
          id: 'key-thing' as const,
          title: 'How it works',
          body: 'Book a pro, pay a deposit, then the rest when done. Home, Explore, and Messages have everything you need.',
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
