import type { ServicePackageRow } from '@/types/service-packages';
import { normalizeDeliverables } from '@/lib/service-packages/validation';

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
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}
