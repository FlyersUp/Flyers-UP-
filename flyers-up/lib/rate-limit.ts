import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * Login, signup, OTP, magic link, password reset — wire this to your auth API routes
 * when you add server-side handlers (Supabase client-only flows won’t hit these).
 */
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "10 m"),
});

/** Chat / conversation send endpoints */
export const messageLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, "1 m"),
});

/** Booking creation (e.g. server actions) */
export const bookingLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 m"),
});

/** Terms / consent / legal acceptance logging */
export const legalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "10 m"),
});
