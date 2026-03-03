'use client';

export type PricingModel = 'flat' | 'hourly' | 'hybrid';

interface PricingModelSelectorProps {
  value: PricingModel;
  onChange: (model: PricingModel) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: PricingModel; label: string; description: string }> = [
  { value: 'flat', label: 'Flat fee', description: 'Fixed price per job' },
  { value: 'hourly', label: 'Hourly', description: 'Charge by the hour' },
  { value: 'hybrid', label: 'Flat + Hourly', description: 'Offer both options' },
];

export function PricingModelSelector({ value, onChange, disabled }: PricingModelSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={[
              'flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all',
              selected
                ? 'border-accent bg-accent/5 shadow-sm'
                : 'border-black/5 bg-white hover:border-black/10 hover:bg-black/[0.02]',
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="text-sm font-medium text-black">{opt.label}</span>
            <span className="text-xs text-black/60">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
