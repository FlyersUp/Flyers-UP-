/**
 * AI Price Calculator for Scope Lock Booking System
 *
 * Formula:
 * base_price = square_feet * 0.10
 * bedroom_cost = bedrooms * 10
 * bathroom_cost = bathrooms * 20
 * subtotal = base_price + bedroom_cost + bathroom_cost
 * condition_modifier: light=0%, moderate=15%, heavy=35%
 * final_estimate = subtotal * (1 + condition_modifier)
 * estimate_low = final_estimate * 0.9
 * estimate_high = final_estimate * 1.1
 */

export type CleaningCondition = 'light' | 'moderate' | 'heavy';
export type CleaningType = 'standard' | 'deep' | 'move_out';

export interface JobDetailsInput {
  square_feet: number;
  bedrooms: number;
  bathrooms: number;
  cleaning_type?: CleaningType;
  condition: CleaningCondition;
  pets?: boolean;
  addons?: string[];
}

export interface PriceEstimate {
  estimate_low: number;
  estimate_high: number;
  subtotal: number;
  condition_modifier: number;
  breakdown: {
    base_price: number;
    bedroom_cost: number;
    bathroom_cost: number;
  };
}

const CONDITION_MODIFIERS: Record<CleaningCondition, number> = {
  light: 0,
  moderate: 0.15,
  heavy: 0.35,
};

const BASE_RATE_PER_SQFT = 0.1;
const BEDROOM_COST = 10;
const BATHROOM_COST = 20;
const RANGE_FACTOR = 0.1; // ±10% for low/high

export function computePriceEstimate(input: JobDetailsInput): PriceEstimate {
  const sqft = Math.max(0, Number(input.square_feet) || 0);
  const bedrooms = Math.max(0, Math.floor(Number(input.bedrooms) || 0));
  const bathrooms = Math.max(0, Math.floor(Number(input.bathrooms) || 0));
  const condition = input.condition || 'moderate';
  const modifier = CONDITION_MODIFIERS[condition] ?? 0.15;

  const base_price = sqft * BASE_RATE_PER_SQFT;
  const bedroom_cost = bedrooms * BEDROOM_COST;
  const bathroom_cost = bathrooms * BATHROOM_COST;
  const subtotal = base_price + bedroom_cost + bathroom_cost;
  const final_estimate = subtotal * (1 + modifier);

  const estimate_low = Math.round(final_estimate * (1 - RANGE_FACTOR) * 100) / 100;
  const estimate_high = Math.round(final_estimate * (1 + RANGE_FACTOR) * 100) / 100;

  return {
    estimate_low,
    estimate_high,
    subtotal: Math.round(subtotal * 100) / 100,
    condition_modifier: modifier,
    breakdown: {
      base_price: Math.round(base_price * 100) / 100,
      bedroom_cost,
      bathroom_cost,
    },
  };
}
