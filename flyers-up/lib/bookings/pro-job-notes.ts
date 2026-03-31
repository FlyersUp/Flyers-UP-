/**
 * Split booking.notes (package scope + optional customer notes) for pro-facing UI.
 */
export type ParsedProBookingNotes = {
  /** Package / scope block (may be empty). */
  scopeText: string;
  /** Text after the "Customer notes:" delimiter, if any. */
  customerNotes: string | null;
};

const CUSTOMER_NOTES_DELIM = '\n\nCustomer notes:\n';

export function parseProBookingNotes(notes: string | null | undefined): ParsedProBookingNotes {
  const raw = (notes ?? '').trim();
  if (!raw) return { scopeText: '', customerNotes: null };
  const idx = raw.indexOf(CUSTOMER_NOTES_DELIM);
  if (idx === -1) return { scopeText: raw, customerNotes: null };
  const scopeText = raw.slice(0, idx).trim();
  const customerNotes = raw.slice(idx + CUSTOMER_NOTES_DELIM.length).trim() || null;
  return { scopeText, customerNotes };
}

export function customerDisplayNameFromProfile(row: {
  full_name?: string | null;
  first_name?: string | null;
} | null | undefined): string {
  if (!row) return 'Customer';
  const full = typeof row.full_name === 'string' ? row.full_name.trim() : '';
  if (full) return full;
  const first = typeof row.first_name === 'string' ? row.first_name.trim() : '';
  if (first) return first;
  return 'Customer';
}
