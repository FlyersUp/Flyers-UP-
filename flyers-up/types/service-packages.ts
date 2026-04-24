/**
 * Service packages (Phase 1) — types shared by API, UI, and booking snapshot.
 */

export type ServicePackageRow = {
  id: string;
  pro_user_id: string;
  title: string;
  short_description: string | null;
  base_price_cents: number;
  estimated_duration_minutes: number | null;
  deliverables: string[];
  /** Cap on distinct recurring customers for this package; null = no package-specific cap. */
  max_recurring_customer_slots: number | null;
  /** When set, package is offered only for this marketplace service type. */
  service_subcategory_id: string | null;
  /** Optional list price (cents) for a "You save …" badge when greater than base_price_cents. */
  compare_at_cents: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ServicePackagePublic = Omit<ServicePackageRow, 'pro_user_id' | 'created_at' | 'updated_at'>;

export type CreateServicePackageInput = {
  title: string;
  short_description?: string | null;
  base_price_cents: number;
  estimated_duration_minutes?: number | null;
  deliverables: string[];
  max_recurring_customer_slots?: number | null;
  /** Defaults true when omitted on create */
  is_active?: boolean;
};

export type UpdateServicePackageInput = Partial<CreateServicePackageInput> & {
  sort_order?: number;
};

/** Add-ons chosen at booking time (immutable; mirrors booking_addons). */
export type SelectedPackageAddonSnapshot = {
  addon_id: string;
  title: string;
  price_cents: number;
};

export type SelectedPackageSnapshot = {
  title: string;
  short_description: string | null;
  base_price_cents: number;
  estimated_duration_minutes: number | null;
  deliverables: string[];
  /** Present when the customer selected service add-ons with this package. */
  selected_addons?: SelectedPackageAddonSnapshot[];
};

export function rowToPublic(row: ServicePackageRow): ServicePackagePublic {
  const {
    id,
    title,
    short_description,
    base_price_cents,
    estimated_duration_minutes,
    deliverables,
    max_recurring_customer_slots,
    service_subcategory_id,
    compare_at_cents,
    is_active,
    sort_order,
  } = row;
  return {
    id,
    title,
    short_description,
    base_price_cents,
    estimated_duration_minutes,
    deliverables,
    max_recurring_customer_slots,
    service_subcategory_id,
    compare_at_cents,
    is_active,
    sort_order,
  };
}
