import type { ServicePackageRow } from '@/types/service-packages';
import { normalizeDeliverables } from '@/lib/service-packages/validation';

/** PostgREST select list — avoids `select('*')` on service_packages. */
export const SERVICE_PACKAGE_DB_SELECT =
  'id, pro_user_id, title, short_description, base_price_cents, estimated_duration_minutes, deliverables, max_recurring_customer_slots, is_active, sort_order, created_at, updated_at';

export function mapServicePackageRow(row: Record<string, unknown>): ServicePackageRow {
  return {
    id: String(row.id),
    pro_user_id: String(row.pro_user_id),
    title: String(row.title ?? ''),
    short_description: row.short_description == null ? null : String(row.short_description),
    base_price_cents: Number(row.base_price_cents ?? 0),
    estimated_duration_minutes:
      row.estimated_duration_minutes == null || row.estimated_duration_minutes === ''
        ? null
        : Number(row.estimated_duration_minutes),
    deliverables: normalizeDeliverables(row.deliverables),
    max_recurring_customer_slots: (() => {
      const v = row.max_recurring_customer_slots;
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}
