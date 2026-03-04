/**
 * Server-side booking quote logic.
 * Computes price breakdown from booking + pro pricing rules.
 * Used by /api/bookings/[bookingId]/quote and /api/bookings/[bookingId]/pay.
 */

const PLATFORM_FEE_RATE =
  Number(process.env.SERVER_PLATFORM_FEE_RATE ?? process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE ?? '0.15') || 0.15;

export interface QuoteBreakdown {
  amountSubtotal: number; // cents
  amountPlatformFee: number; // cents
  amountTravelFee: number; // cents
  amountTotal: number; // cents
  currency: string;
}

export interface QuoteResult {
  bookingId: string;
  quote: QuoteBreakdown;
  serviceName: string;
  proName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string;
  durationHours?: number;
}

export interface BookingForQuote {
  id: string;
  customer_id: string;
  pro_id: string;
  service_date: string;
  service_time: string;
  address?: string | null;
  price?: number | null;
  status: string;
  duration_hours?: number | null;
  miles_distance?: number | null;
  flat_fee_selected?: boolean | null;
  hourly_selected?: boolean | null;
}

export interface ProPricingForQuote {
  pricing_model?: string | null;
  starting_price?: number | null;
  starting_rate?: number | null;
  hourly_rate?: number | null;
  min_hours?: number | null;
  travel_fee_enabled?: boolean | null;
  travel_fee_base?: number | null;
  travel_free_within_miles?: number | null;
  travel_extra_per_mile?: number | null;
}

/**
 * Compute quote from booking + pro pricing.
 * - If booking.price is set: use it as total, derive breakdown (platform fee = total * rate / (1 + rate), subtotal = total - platform_fee).
 * - Otherwise: compute from pro_profiles (base + travel).
 */
export function computeQuote(
  booking: BookingForQuote,
  proPricing: ProPricingForQuote | null,
  serviceName: string,
  proName: string
): QuoteResult {
  const quote = computeQuoteBreakdown(booking, proPricing);
  return {
    bookingId: booking.id,
    quote,
    serviceName,
    proName,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time,
    address: booking.address ?? undefined,
    durationHours: booking.duration_hours ?? undefined,
  };
}

function computeQuoteBreakdown(
  booking: BookingForQuote,
  proPricing: ProPricingForQuote | null
): QuoteBreakdown {
  const currency = 'usd';

  // If booking has price (numeric, dollars): use as total and derive breakdown
  const bookingPriceDollars = Number(booking.price ?? 0);
  if (Number.isFinite(bookingPriceDollars) && bookingPriceDollars > 0) {
    const amountTotalCents = Math.round(bookingPriceDollars * 100);
    // platform_fee = total * rate / (1 + rate), subtotal = total - platform_fee
    const platformFeeCents = Math.round(amountTotalCents * PLATFORM_FEE_RATE / (1 + PLATFORM_FEE_RATE));
    const subtotalCents = amountTotalCents - platformFeeCents;
    return {
      amountSubtotal: subtotalCents,
      amountPlatformFee: platformFeeCents,
      amountTravelFee: 0,
      amountTotal: amountTotalCents,
      currency,
    };
  }

  // Compute from pro pricing
  let baseCents = 0;
  const model = proPricing?.pricing_model ?? 'flat';
  const startingPrice = Number(proPricing?.starting_price ?? proPricing?.starting_rate ?? 0);
  const hourlyRate = Number(proPricing?.hourly_rate ?? 0);
  const minHours = Number(proPricing?.min_hours ?? 0);
  const durationHours = Number(booking.duration_hours ?? 0);
  const flatSelected = booking.flat_fee_selected === true;
  const hourlySelected = booking.hourly_selected === true;

  if (model === 'flat' || (model === 'hybrid' && flatSelected)) {
    baseCents = Math.round(startingPrice * 100);
  } else if (model === 'hourly' || (model === 'hybrid' && hourlySelected)) {
    const hours = Math.max(durationHours ?? 0, minHours > 0 ? minHours : 0);
    baseCents = Math.round(hours * hourlyRate * 100);
  } else if (model === 'hybrid') {
    // Prefer flat for <=2h, hourly for >2h (only if duration exists)
    if (durationHours > 0 && durationHours > 2 && hourlyRate > 0) {
      const hours = Math.max(durationHours, minHours > 0 ? minHours : 0);
      baseCents = Math.round(hours * hourlyRate * 100);
    } else {
      baseCents = Math.round(startingPrice * 100);
    }
  } else {
    baseCents = Math.round(startingPrice * 100);
  }

  let travelCents = 0;
  if (proPricing?.travel_fee_enabled) {
    const base = Number(proPricing.travel_fee_base ?? 0);
    travelCents = Math.round(base * 100);
    const miles = Number(booking.miles_distance ?? 0);
    const freeMiles = Number(proPricing.travel_free_within_miles ?? 0);
    const extraPerMile = Number(proPricing.travel_extra_per_mile ?? 0);
    if (miles > 0 && freeMiles >= 0 && extraPerMile > 0 && miles > freeMiles) {
      travelCents += Math.round((miles - freeMiles) * extraPerMile * 100);
    }
  }

  const amountSubtotal = baseCents + travelCents;
  const amountPlatformFee = Math.round(amountSubtotal * PLATFORM_FEE_RATE);
  const amountTotal = amountSubtotal + amountPlatformFee;

  return {
    amountSubtotal,
    amountPlatformFee,
    amountTravelFee: travelCents,
    amountTotal,
    currency,
  };
}
