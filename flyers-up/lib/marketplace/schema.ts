/**
 * Zod schemas for marketplace API validation
 */
import { z } from 'zod';

export const createDemandRequestSchema = z.object({
  service_slug: z.string().min(1),
  subcategory_slug: z.string().optional().nullable(),
  borough: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  scheduled_for: z.string().optional().nullable(),
  urgency: z.enum(['normal', 'priority', 'emergency']).default('normal'),
  base_price_cents: z.number().int().min(0).default(0),
});

export const claimRequestSchema = z.object({
  request_id: z.string().uuid(),
});

export const presencePingSchema = z.object({
  is_online: z.boolean(),
  borough: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  last_lat: z.number().optional().nullable(),
  last_lng: z.number().optional().nullable(),
});

export const adminSettingsUpdateSchema = z.object({
  surge_rules: z
    .object({
      enabled: z.boolean(),
      maxMultiplier: z.number().min(1).max(2),
      minMultiplier: z.number().min(1),
      targetRequestsPerPro: z.number().min(0),
      urgencyBoost: z.record(z.string(), z.number()),
    })
    .optional(),
});
