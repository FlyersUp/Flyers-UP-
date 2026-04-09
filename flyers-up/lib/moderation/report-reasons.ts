export const USER_REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'sexual_misconduct', label: 'Sexual misconduct' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'scam', label: 'Scam' },
  { value: 'other', label: 'Other' },
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number]['value'];

export function isValidUserReportReason(v: string): v is UserReportReason {
  return USER_REPORT_REASONS.some((r) => r.value === v);
}
