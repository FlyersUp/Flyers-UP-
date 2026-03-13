'use client';

const STEPS = ['Role', 'Occupation', 'Services', 'Setup'] as const;

export function OnboardingProgress({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  const stepIndex = currentStep - 1;
  return (
    <nav aria-label="Onboarding progress" className="mb-6">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((label, i) => {
          const isComplete = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <li
              key={label}
              className={`flex-1 flex flex-col items-center min-w-0 ${
                isCurrent ? 'text-accent font-medium' : isComplete ? 'text-accent' : 'text-muted'
              }`}
            >
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 mx-0.5 ${i <= stepIndex ? 'bg-accent' : 'bg-surface2'}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`flex items-center justify-center size-8 rounded-full text-xs shrink-0 ${
                    isCurrent ? 'bg-accent text-accentContrast' : isComplete ? 'bg-accent/20 text-accent' : 'bg-surface2'
                  }`}
                >
                  {isComplete ? '✓' : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-0.5 ${i < stepIndex ? 'bg-accent' : 'bg-surface2'}`}
                    aria-hidden
                  />
                )}
              </div>
              <span className="mt-1.5 text-[10px] sm:text-xs truncate max-w-full">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
