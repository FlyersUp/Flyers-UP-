'use client';

const PRO_STEPS = [
  'Welcome',
  'Occupation',
  'Services',
  'Service Area',
  'Availability',
  'Pricing',
  'Profile',
  'Payout',
  'Policies',
  'Launch',
] as const;

export type ProOnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function ProOnboardingProgress({ currentStep }: { currentStep: ProOnboardingStep }) {
  const stepIndex = currentStep - 1;
  return (
    <nav aria-label="Pro onboarding progress" className="mb-6">
      <div className="flex items-center justify-between text-xs text-muted mb-2">
        <span>Step {currentStep} of 10</span>
      </div>
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {PRO_STEPS.map((label, i) => {
          const isComplete = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <li
              key={label}
              className={`flex-shrink-0 flex flex-col items-center min-w-0 ${
                isCurrent ? 'text-accent font-medium' : isComplete ? 'text-accent' : 'text-muted'
              }`}
            >
              <span
                className={`flex items-center justify-center size-7 rounded-full text-xs ${
                  isCurrent ? 'bg-accent text-accentContrast' : isComplete ? 'bg-accent/20 text-accent' : 'bg-surface2'
                }`}
              >
                {isComplete ? '✓' : i + 1}
              </span>
              <span className="mt-1 hidden sm:inline text-[10px] truncate max-w-[4rem]">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
