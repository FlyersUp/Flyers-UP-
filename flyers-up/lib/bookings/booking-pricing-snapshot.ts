import type { ChargeModel } from '@/lib/pricing/fees';

/** Frozen at booking time; matches `bookings.charge_model` CHECK / app usage. */
export type BookingChargeModel = ChargeModel;

/**
 * Immutable marketplace pricing snapshot (logical shape).
 * Persisted on `bookings` with `total_cents` stored as `customer_total_cents`.
 */
export type BookingPricingSnapshot = {
  charge_model: BookingChargeModel | null;
  subtotal_cents: number;
  service_fee_cents: number;
  convenience_fee_cents: number;
  protection_fee_cents: number;
  demand_fee_cents: number;
  total_cents: number;
  pro_earnings_cents: number;
  platform_revenue_cents: number;

  flat_fee_cents: number | null;
  hourly_rate_cents: number | null;
  base_fee_cents: number | null;
  included_hours: number | null;
  actual_hours_estimate: number | null;
  overage_hourly_rate_cents: number | null;
  minimum_job_cents: number | null;
  demand_multiplier: number | null;
};

/** Columns written to `public.bookings` (snake_case, Supabase-aligned). */
export type BookingsTablePricingSnapshotRow = {
  charge_model: string | null;
  subtotal_cents: number;
  service_fee_cents: number;
  convenience_fee_cents: number;
  protection_fee_cents: number;
  demand_fee_cents: number;
  fee_total_cents: number;
  customer_total_cents: number;
  pro_earnings_cents: number;
  platform_revenue_cents: number;
  flat_fee_cents: number | null;
  hourly_rate_cents: number | null;
  base_fee_cents: number | null;
  included_hours: number | null;
  actual_hours_estimate: number | null;
  overage_hourly_rate_cents: number | null;
  minimum_job_cents: number | null;
  demand_multiplier: number | null;
};

/**
 * Map logical snapshot → DB row fragment. Prefer `feeTotalCents` from the fee engine when provided
 * so it stays identical to `calculateMarketplaceFees` / Stripe metadata.
 */
export function bookingPricingSnapshotToDbRow(
  s: BookingPricingSnapshot,
  options?: { feeTotalCents?: number }
): BookingsTablePricingSnapshotRow {
  const feeTotalCents =
    options?.feeTotalCents ??
    s.service_fee_cents + s.convenience_fee_cents + s.protection_fee_cents + s.demand_fee_cents;

  return {
    charge_model: s.charge_model,
    subtotal_cents: s.subtotal_cents,
    service_fee_cents: s.service_fee_cents,
    convenience_fee_cents: s.convenience_fee_cents,
    protection_fee_cents: s.protection_fee_cents,
    demand_fee_cents: s.demand_fee_cents,
    fee_total_cents: feeTotalCents,
    customer_total_cents: s.total_cents,
    pro_earnings_cents: s.pro_earnings_cents,
    platform_revenue_cents: s.platform_revenue_cents,
    flat_fee_cents: s.flat_fee_cents,
    hourly_rate_cents: s.hourly_rate_cents,
    base_fee_cents: s.base_fee_cents,
    included_hours: s.included_hours,
    actual_hours_estimate: s.actual_hours_estimate,
    overage_hourly_rate_cents: s.overage_hourly_rate_cents,
    minimum_job_cents: s.minimum_job_cents,
    demand_multiplier: s.demand_multiplier,
  };
}
