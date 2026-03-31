import { z } from 'zod';
import type { CreateServicePackageInput, UpdateServicePackageInput } from '@/types/service-packages';

const TITLE_MAX = 120;
const DESC_MAX = 500;
const ITEM_MAX = 200;
const DELIVERABLES_MIN = 1;
const DELIVERABLES_MAX = 5;

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function normalizeDeliverables(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const t = normalizeWs(x);
    if (t.length > 0) out.push(t);
  }
  return out.slice(0, DELIVERABLES_MAX);
}

/** Trim and drop empties; does not cap count (used for validation). */
function trimDeliverableList(arr: string[]): string[] {
  const out: string[] = [];
  for (const x of arr) {
    const t = normalizeWs(String(x));
    if (t.length > 0) out.push(t);
  }
  return out;
}

const deliverablesSchema = z
  .array(z.string())
  .transform((arr) => trimDeliverableList(arr))
  .pipe(
    z
      .array(z.string().min(1).max(ITEM_MAX))
      .min(DELIVERABLES_MIN)
      .max(DELIVERABLES_MAX)
  );

export const createServicePackageSchema = z.object({
  title: z
    .string()
    .transform((s) => normalizeWs(s))
    .pipe(z.string().min(1).max(TITLE_MAX)),
  short_description: z
    .unknown()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = normalizeWs(String(v));
      return t.length === 0 ? null : t;
    })
    .refine((v) => v === null || (v.length >= 1 && v.length <= DESC_MAX), {
      message: `Short description must be at most ${DESC_MAX} characters`,
    }),
  base_price_cents: z.coerce.number().int().positive(),
  estimated_duration_minutes: z
    .union([z.coerce.number().int().positive(), z.null(), z.undefined()])
    .transform((v) => (v === undefined ? null : v)),
  deliverables: deliverablesSchema,
  is_active: z.boolean().optional().default(true),
  max_recurring_customer_slots: z
    .union([z.coerce.number().int().min(0).max(100), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v)),
});

export type CreateServicePackageParsed = z.infer<typeof createServicePackageSchema>;

export function parseCreateServicePackageInput(body: unknown): CreateServicePackageInput {
  return createServicePackageSchema.parse(body) as CreateServicePackageInput;
}

const optionalDesc = z
  .unknown()
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v == null) return null;
    const t = normalizeWs(String(v));
    return t.length === 0 ? null : t;
  })
  .refine((v) => v === undefined || v === null || (v.length >= 1 && v.length <= DESC_MAX), {
    message: `Short description must be at most ${DESC_MAX} characters`,
  });

const optionalDeliverables = z
  .array(z.string())
  .optional()
  .transform((arr) => (arr === undefined ? undefined : trimDeliverableList(arr)))
  .superRefine((arr, ctx) => {
    if (arr === undefined) return;
    if (arr.length < DELIVERABLES_MIN || arr.length > DELIVERABLES_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deliverables: ${DELIVERABLES_MIN}–${DELIVERABLES_MAX} non-empty items required`,
      });
    }
    for (const s of arr) {
      if (s.length > ITEM_MAX) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Each item max ${ITEM_MAX} characters` });
        break;
      }
    }
  });

export const updateServicePackageSchema = z.object({
  title: z
    .string()
    .optional()
    .transform((s) => (s === undefined ? undefined : normalizeWs(s)))
    .pipe(z.union([z.undefined(), z.string().min(1).max(TITLE_MAX)])),
  short_description: optionalDesc,
  base_price_cents: z.coerce.number().int().positive().optional(),
  estimated_duration_minutes: z
    .union([z.coerce.number().int().positive(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v)),
  deliverables: optionalDeliverables,
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(1_000_000).optional(),
  max_recurring_customer_slots: z
    .union([z.coerce.number().int().min(0).max(100), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v)),
});

export function parseUpdateServicePackageInput(body: unknown): UpdateServicePackageInput {
  const parsed = updateServicePackageSchema.parse(body);
  return parsed as UpdateServicePackageInput;
}
