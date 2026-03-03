'use client';

import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

export interface TravelRulesFormValues {
  travelFeeEnabled: boolean;
  travelFeeBase: string;
  travelFreeWithinMiles: string;
  serviceRadiusMiles: string;
  travelExtraPerMile: string;
}

interface TravelRulesFormProps {
  values: TravelRulesFormValues;
  onChange: (values: TravelRulesFormValues) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof TravelRulesFormValues, string>>;
}

export function TravelRulesForm({ values, onChange, disabled, errors = {} }: TravelRulesFormProps) {
  const update = (key: keyof TravelRulesFormValues, v: boolean | string) => {
    onChange({ ...values, [key]: v });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-black/5 bg-white">
        <div>
          <div className="text-sm font-medium text-black">Charge a travel fee</div>
          <p className="text-xs text-black/60 mt-0.5">Add a fee for jobs outside your free range</p>
        </div>
        <Switch
          checked={values.travelFeeEnabled}
          onCheckedChange={(v) => update('travelFeeEnabled', v)}
          disabled={disabled}
          aria-label="Charge travel fee"
        />
      </div>

      <div className="space-y-3">
        <Input
          label="Max service radius (miles)"
          type="number"
          min="1"
          step="1"
          value={values.serviceRadiusMiles}
          onChange={(e) => update('serviceRadiusMiles', e.target.value)}
          placeholder="e.g., 25"
          disabled={disabled}
          error={errors.serviceRadiusMiles}
        />
        <p className="text-xs text-black/60">How far you'll travel for jobs. Required.</p>
      </div>

      {values.travelFeeEnabled && (
        <div className="space-y-3 p-4 rounded-xl border border-black/5 bg-white">
          <div className="text-sm font-medium text-black">Travel fee details</div>
          <Input
            label="Travel fee base ($)"
            type="number"
            min="0"
            step="1"
            value={values.travelFeeBase}
            onChange={(e) => update('travelFeeBase', e.target.value)}
            placeholder="Optional"
            disabled={disabled}
            error={errors.travelFeeBase}
          />
          <Input
            label="Free within (miles)"
            type="number"
            min="0"
            step="1"
            value={values.travelFreeWithinMiles}
            onChange={(e) => update('travelFreeWithinMiles', e.target.value)}
            placeholder="Optional"
            disabled={disabled}
            error={errors.travelFreeWithinMiles}
          />
          <Input
            label="Extra per mile beyond free range ($/mile)"
            type="number"
            min="0"
            step="0.1"
            value={values.travelExtraPerMile}
            onChange={(e) => update('travelExtraPerMile', e.target.value)}
            placeholder="Optional"
            disabled={disabled}
            error={errors.travelExtraPerMile}
          />
          <p className="text-xs text-black/60">
            Base fee applies once. Extra per mile charged for distance beyond free range.
          </p>
        </div>
      )}
    </div>
  );
}
