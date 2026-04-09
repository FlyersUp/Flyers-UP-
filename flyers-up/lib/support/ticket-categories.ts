export const SUPPORT_TICKET_CATEGORIES = [
  { value: 'account', label: 'Account' },
  { value: 'payments', label: 'Payments' },
  { value: 'booking_issue', label: 'Booking issue' },
  { value: 'pro_issue', label: 'Issue with a pro' },
  { value: 'customer_issue', label: 'Issue with a customer' },
  { value: 'technical_bug', label: 'Technical / bug' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
] as const;

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]['value'];

export function isValidSupportCategory(v: string): v is SupportTicketCategory {
  return SUPPORT_TICKET_CATEGORIES.some((c) => c.value === v);
}
