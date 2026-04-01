/**
 * Shared package + add-on scope for booking requests.
 * Used by createBookingWithPayment (server action) and createBooking (client API helper)
 * so notes, selected_package_snapshot, and add-on validation stay identical.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildSelectedPackageSnapshot,
  formatAddonScopeSection,
  formatPackageScopeNotes,
  type AddonScopeLine,
} from '@/lib/service-packages/snapshot';

export type ValidatedBookingAddon = {
  id: string;
  title: string;
  price_cents: number;
};

export async function validateActiveAddonsForProCategory(
  supabase: SupabaseClient,
  proUserId: string,
  categorySlug: string | undefined,
  selectedAddonIds: string[]
): Promise<{ ok: true; addons: ValidatedBookingAddon[] } | { ok: false; error: string }> {
  if (!selectedAddonIds.length) return { ok: true, addons: [] };
  if (!categorySlug) {
    return { ok: false, error: 'Service category not found for this pro.' };
  }

  const { data: activeAddons, error: addonsErr } = await supabase
    .from('service_addons')
    .select('id, title, price_cents')
    .eq('pro_id', proUserId)
    .eq('service_category', categorySlug)
    .eq('is_active', true);

  if (addonsErr) {
    return { ok: false, error: 'Could not validate add-ons. Please try again.' };
  }

  const picked = (activeAddons || []).filter((a) => selectedAddonIds.includes(a.id));
  if (picked.length !== selectedAddonIds.length) {
    return { ok: false, error: 'One or more selected add-ons are no longer available.' };
  }

  return {
    ok: true,
    addons: picked.map((a) => ({
      id: a.id,
      title: String(a.title ?? ''),
      price_cents: Number(a.price_cents ?? 0),
    })),
  };
}

export type PackageRowForSnapshot = Record<string, unknown>;

export function buildNotesAndPackageSnapshotForRequest(opts: {
  /** Loaded package row, or null when booking without a package */
  packageRow: PackageRowForSnapshot | null;
  customerNotes: string;
  validatedAddons: ValidatedBookingAddon[];
  /** Pro list rate in cents when no package is selected */
  startingPriceCents: number;
}): {
  notesForBooking: string;
  selectedPackageId: string | null;
  selectedPackageSnapshot: Record<string, unknown> | null;
  basePriceCents: number;
  durationMinutes: number;
} {
  const { packageRow, customerNotes, validatedAddons, startingPriceCents } = opts;

  const addonScopeLines: AddonScopeLine[] = validatedAddons.map((a) => ({
    title: a.title,
    price_cents: a.price_cents,
  }));

  let notesForBooking = '';
  let selectedPackageId: string | null = null;
  let selectedPackageSnapshot: Record<string, unknown> | null = null;
  let basePriceCents = Math.max(0, Math.round(startingPriceCents));
  let durationMinutes = 60;

  if (packageRow) {
    const pkg = packageRow;
    basePriceCents = Math.round(Number(pkg.base_price_cents ?? 0));
    const est = pkg.estimated_duration_minutes;
    if (est != null && Number(est) > 0) {
      durationMinutes = Math.round(Number(est));
    }

    const snapshot = buildSelectedPackageSnapshot({
      title: String(pkg.title ?? ''),
      short_description: pkg.short_description == null ? null : String(pkg.short_description),
      base_price_cents: basePriceCents,
      estimated_duration_minutes:
        est == null || est === '' ? null : Math.round(Number(est)),
      deliverables: pkg.deliverables,
    });
    notesForBooking = formatPackageScopeNotes(snapshot, customerNotes, addonScopeLines);
    selectedPackageId = String(pkg.id ?? '');
    selectedPackageSnapshot = {
      ...snapshot,
      ...(validatedAddons.length > 0
        ? {
            selected_addons: validatedAddons.map((a) => ({
              addon_id: a.id,
              title: a.title,
              price_cents: a.price_cents,
            })),
          }
        : {}),
    };
  } else {
    const cn = (customerNotes || '').trim();
    if (validatedAddons.length > 0) {
      const addonBlock = formatAddonScopeSection(addonScopeLines);
      notesForBooking = cn ? `${addonBlock}\n\nCustomer notes:\n${cn}` : addonBlock;
    } else {
      notesForBooking = cn;
    }
  }

  return {
    notesForBooking,
    selectedPackageId,
    selectedPackageSnapshot,
    basePriceCents,
    durationMinutes,
  };
}

export function bookingAddonsInsertRows(
  bookingId: string,
  validatedAddons: ValidatedBookingAddon[]
): Array<{
  booking_id: string;
  addon_id: string;
  title_snapshot: string;
  price_snapshot_cents: number;
}> {
  return validatedAddons.map((addon) => ({
    booking_id: bookingId,
    addon_id: addon.id,
    title_snapshot: addon.title,
    price_snapshot_cents: addon.price_cents,
  }));
}
