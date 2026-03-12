'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { JobDetails, CleaningCondition, CleaningType } from '@/lib/scopeLock/jobDetailsSchema';

export interface JobDetailsFormProps {
  value: Partial<JobDetails>;
  onChange: (value: Partial<JobDetails>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

const CLEANING_TYPES: { value: CleaningType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep Clean' },
  { value: 'move_out', label: 'Move-out' },
];

const CONDITIONS: { value: CleaningCondition; label: string }[] = [
  { value: 'light', label: 'Light (minimal dirt)' },
  { value: 'moderate', label: 'Moderate (normal wear)' },
  { value: 'heavy', label: 'Heavy (significant buildup)' },
];

const ADDONS = [
  { id: 'inside_fridge', label: 'Inside fridge' },
  { id: 'inside_oven', label: 'Inside oven' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'windows', label: 'Windows' },
  { id: 'baseboards', label: 'Baseboards' },
];

export function JobDetailsForm({ value, onChange, errors = {}, disabled }: JobDetailsFormProps) {
  const update = useCallback(
    (key: keyof JobDetails, val: unknown) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange]
  );

  const toggleAddon = useCallback(
    (addonId: string) => {
      const addons = value.addons ?? [];
      const next = addons.includes(addonId)
        ? addons.filter((a) => a !== addonId)
        : [...addons, addonId];
      update('addons', next);
    },
    [value.addons, update]
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="home_size_sqft">Home Size (sq ft) *</Label>
        <Input
          id="home_size_sqft"
          type="number"
          min={100}
          max={50000}
          value={value.home_size_sqft ?? ''}
          onChange={(e) => update('home_size_sqft', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="e.g. 1500"
          error={errors.home_size_sqft}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bedrooms">Bedrooms *</Label>
          <Input
            id="bedrooms"
            type="number"
            min={0}
            max={50}
            value={value.bedrooms ?? ''}
            onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            error={errors.bedrooms}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="bathrooms">Bathrooms *</Label>
          <Input
            id="bathrooms"
            type="number"
            min={0}
            max={20}
            value={value.bathrooms ?? ''}
            onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            error={errors.bathrooms}
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="cleaning_type">Cleaning Type *</Label>
        <select
          id="cleaning_type"
          value={value.cleaning_type ?? 'standard'}
          onChange={(e) => update('cleaning_type', e.target.value as CleaningType)}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
        >
          {CLEANING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Condition *</Label>
        <div className="mt-2 space-y-2">
          {CONDITIONS.map((c) => (
            <label key={c.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value={c.value}
                checked={value.condition === c.value}
                onChange={() => update('condition', c.value)}
                disabled={disabled}
                className="w-4 h-4 rounded-full border-black/20 text-[#B2FBA5] focus:ring-[#B2FBA5]"
              />
              <span className="text-sm text-[#111]">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.pets ?? false}
            onChange={(e) => update('pets', e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-black/20 text-[#B2FBA5] focus:ring-[#B2FBA5]"
          />
          <span className="text-sm font-medium text-[#111]">Pets in home</span>
        </label>
      </div>

      <div>
        <Label htmlFor="addons">Add-ons</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ADDONS.map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-black/10 bg-white cursor-pointer hover:bg-[#F5F5F5]">
              <input
                type="checkbox"
                checked={(value.addons ?? []).includes(a.id)}
                onChange={() => toggleAddon(a.id)}
                disabled={disabled}
                className="w-4 h-4 rounded border-black/20 text-[#B2FBA5] focus:ring-[#B2FBA5]"
              />
              <span className="text-sm text-[#111]">{a.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
