/**
 * Availability + Travel Radius Validation
 * Validates before deposit payment: active, hours, blocked dates, overlaps, travel, lead time
 */

export type ValidationResult =
  | { allowed: true; instantBookAllowed?: boolean; requestOnlyAllowed?: boolean }
  | { allowed: false; rejectionReason: string };

export interface ProAvailabilityContext {
  isActive: boolean;
  travelRadiusMiles: number | null;
  serviceAreaMode: 'radius' | 'boroughs' | 'zip_codes' | null;
  serviceAreaValues: string[];
  leadTimeMinutes: number;
  bufferBetweenJobsMinutes: number;
  sameDayEnabled: boolean;
  blockedDates: Date[];
  existingBookingRanges: { start: Date; end: Date }[];
  businessHours: unknown;
  jobAddress?: string;
  jobLat?: number | null;
  jobLng?: number | null;
  proLat?: number | null;
  proLng?: number | null;
  requestedStart: Date;
  estimatedDurationMinutes: number;
}

export function validateAvailability(ctx: ProAvailabilityContext): ValidationResult {
  if (!ctx.isActive) {
    return { allowed: false, rejectionReason: 'Pro is not currently active' };
  }

  const now = new Date();
  const leadTimeMs = ctx.leadTimeMinutes * 60 * 1000;
  if (ctx.requestedStart.getTime() - now.getTime() < leadTimeMs && !ctx.sameDayEnabled) {
    return {
      allowed: false,
      rejectionReason: `Pro requires ${ctx.leadTimeMinutes} min lead time. Same-day not enabled.`,
    };
  }

  if (ctx.sameDayEnabled && ctx.requestedStart.getTime() - now.getTime() < leadTimeMs) {
    const sameDayStart = new Date(now);
    sameDayStart.setHours(0, 0, 0, 0);
    const requestedDay = new Date(ctx.requestedStart);
    requestedDay.setHours(0, 0, 0, 0);
    if (requestedDay.getTime() === sameDayStart.getTime()) {
      // Same day — still need lead time
      if (ctx.requestedStart.getTime() - now.getTime() < leadTimeMs) {
        return {
          allowed: false,
          rejectionReason: `Same-day allowed but need ${ctx.leadTimeMinutes} min lead time`,
        };
      }
    }
  }

  const requestedDate = new Date(ctx.requestedStart);
  requestedDate.setHours(0, 0, 0, 0);
  for (const bd of ctx.blockedDates) {
    const d = bd instanceof Date ? bd : new Date(bd);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === requestedDate.getTime()) {
      return { allowed: false, rejectionReason: 'Pro has blocked this date' };
    }
  }

  const endAt = new Date(ctx.requestedStart.getTime() + ctx.estimatedDurationMinutes * 60 * 1000);
  const bufferMs = ctx.bufferBetweenJobsMinutes * 60 * 1000;

  for (const range of ctx.existingBookingRanges) {
    const existingStart = range.start.getTime();
    const existingEnd = range.end.getTime();
    const reqStart = ctx.requestedStart.getTime();
    const reqEnd = endAt.getTime();

    if (reqStart < existingEnd + bufferMs && reqEnd + bufferMs > existingStart) {
      return {
        allowed: false,
        rejectionReason: `Overlaps with existing booking (need ${ctx.bufferBetweenJobsMinutes} min buffer)`,
      };
    }
  }

  if (ctx.travelRadiusMiles != null && ctx.jobLat != null && ctx.jobLng != null && ctx.proLat != null && ctx.proLng != null) {
    const distMiles = haversineMiles(ctx.proLat, ctx.proLng, ctx.jobLat, ctx.jobLng);
    if (distMiles > ctx.travelRadiusMiles) {
      return {
        allowed: false,
        rejectionReason: `Job location is ${distMiles.toFixed(1)} mi away; Pro serves within ${ctx.travelRadiusMiles} mi`,
      };
    }
  }

  return {
    allowed: true,
    instantBookAllowed: true,
    requestOnlyAllowed: true,
  };
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
