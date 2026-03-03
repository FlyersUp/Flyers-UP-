'use client';

import { Input } from '@/components/ui/Input';
import type { PricingModel } from './PricingModelSelector';

export interface RatesFormValues {
  startingPrice: string;
  minJobPrice: string;
  whatIncluded: string;
  hourlyRate: string;
  minHours: string;
  overtimeRate: string;
}

interface RatesFormProps {
  model: PricingModel;
  values: RatesFormValues;
  onChange: (values: RatesFormValues) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof RatesFormValues, string>>;
}

export function RatesForm(props: RatesFormProps) {
  const { model, values, onChange, disabled, errors = {} } = props;

  const update = (key: keyof RatesFormValues, v: string) => {
    onChange({ ...values, [key]: v });
  };

  const showFlat = model === 'flat' || model === 'hybrid';
  const showHourly = model === 'hourly' || model === 'hybrid';

  return (
    <div className="space-y-4">
      {showFlat && (
        <div className="space-y-3 p-4 rounded-xl border border-black/5 bg-white">
          <div className="text-sm font-medium text-black">Flat fee</div>
          <Input
            label="Starting price ($)"
            type="number"
            value={values.startingPrice}
            onChange={(e) => update('startingPrice', e.target.value)}
            placeholder="e.g., 75"
            disabled={disabled}
            error={errors.startingPrice}
          />
          <Input
            label="Minimum job price ($)"
            type="number"
            value={values.minJobPrice}
            onChange={(e) => update('minJobPrice', e.target.value)}
            placeholder="Optional"
            disabled={disabled}
            error={errors.minJobPrice}
          />
          <Input
            label="What's included"
            type="text"
            value={values.whatIncluded}
            onChange={(e) => update('whatIncluded', e.target.value)}
            placeholder="e.g., 2-hour minimum, basic supplies"
            disabled={disabled}
            error={errors.whatIncluded}
          />
        </div>
      )}

      {showHourly && (
        <div className="space-y-3 p-4 rounded-xl border border-black/5 bg-white">
          <div className="text-sm font-medium text-black">Hourly</div>
          <Input
            label="Hourly rate ($/hr)"
            type="number"
            value={values.hourlyRate}
            onChange={(e) => update('hourlyRate', e.target.value)}
            placeholder="e.g., 50"
            disabled={disabled}
            error={errors.hourlyRate}
          />
          <Input
            label="Minimum hours"
            type="number"
            value={values.minHours}
            onChange={(e) => update('minHours', e.target.value)}
            placeholder="Optional"
            disabled={disabled}
            error={errors.minHours}
          />
          <Input
            label="Overtime rate ($/hr)"
            type="number"
            value={values.overtimeRate}
            onChange={(e) => update('overtimeRate', e.target.value)}
            placeholder="Optional"
            disabled={disabled}
            error={errors.overtimeRate}
          />
        </div>
      )}
    </div>
  );
}
