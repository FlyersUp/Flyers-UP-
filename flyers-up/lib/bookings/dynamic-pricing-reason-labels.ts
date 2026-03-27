/**
 * Customer- and support-friendly labels for dynamic pricing reason codes
 * (stored on Stripe metadata as a comma-separated list).
 */
const LABELS: Record<string, string> = {
  same_day_supply_tightness: 'Same-day timing with elevated demand in your area',
  asap_supply_tightness: 'ASAP timing with elevated demand',
  asap_extreme_supply_tightness: 'ASAP timing with very high demand',
  high_conversion_risk_fee_softening: 'Adjusted fees to improve checkout success',
  premium_trust_risk_uplift: 'Additional protection for higher-trust service categories',
  service_fee_uplift_supply_pressure: 'Slight service fee adjustment for busy periods',
  service_fee_softening_conversion_risk: 'Reduced service fee on smaller first-time bookings',
  first_booking_low_ticket_fee_softening: 'First-booking considerations applied',
  repeat_customer_neutral_pricing: 'Repeat customer pricing baseline',
  demand_fee_cap_applied: 'High-demand fee capped for fairness',
  fee_cap_applied_under_25: 'Total fees capped for smaller bookings',
  fee_cap_applied_mid_tier: 'Total fees capped for this booking size',
  fee_cap_applied_high_tier: 'Total fees capped for this booking size',
  first_booking_convenience_waived: 'Convenience fee waived for your first booking',
};

export function labelDynamicPricingReason(code: string): string {
  const key = String(code ?? '').trim();
  if (!key) return '';
  return LABELS[key] ?? key.replace(/_/g, ' ');
}
