/**
 * Structured job details schema for Scope Lock Booking System
 * Used for cleaning and other service occupations.
 */

import { z } from 'zod';

export const cleaningConditionSchema = z.enum(['light', 'moderate', 'heavy']);
export type CleaningCondition = z.infer<typeof cleaningConditionSchema>;

export const cleaningTypeSchema = z.enum(['standard', 'deep', 'move_out']);
export type CleaningType = z.infer<typeof cleaningTypeSchema>;

export const jobDetailsSchema = z.object({
  // Cleaning-specific (example)
  home_size_sqft: z.number().min(100).max(50000),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().int().min(0).max(20),
  cleaning_type: cleaningTypeSchema.default('standard'),
  condition: cleaningConditionSchema,
  pets: z.boolean().default(false),
  addons: z.array(z.string()).default([]),
});

export type JobDetails = z.infer<typeof jobDetailsSchema>;

export const PHOTO_CATEGORIES = ['kitchen', 'bathroom', 'main_room', 'problem_areas'] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const photoEntrySchema = z.object({
  category: z.enum(PHOTO_CATEGORIES),
  url: z.string().url(),
});

export type PhotoEntry = z.infer<typeof photoEntrySchema>;

export const REQUIRED_PHOTO_MIN = 2;
export const REQUIRED_CATEGORIES = ['kitchen', 'bathroom', 'main_room'] as const;
