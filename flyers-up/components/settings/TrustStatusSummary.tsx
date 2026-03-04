'use client';

import { Shield, FileCheck, Search, Award } from 'lucide-react';
import { StatusChip } from './StatusChip';
import type { StatusChipProps } from './StatusChip';

interface TrustStatusRow {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  status: StatusChipProps['status'];
  labelText: string;
}

interface TrustStatusSummaryProps {
  guidelinesStatus: 'verified' | 'not_started';
  guidelinesAcceptedAt?: string | null;
  insuranceStatus: 'verified' | 'not_started';
  backgroundCheckStatus: 'not_started' | 'pending' | 'verified';
  accountStanding: 'good' | 'warning';
}

export function TrustStatusSummary({
  guidelinesStatus,
  guidelinesAcceptedAt,
  insuranceStatus,
  backgroundCheckStatus,
  accountStanding,
}: TrustStatusSummaryProps) {
  const rows: TrustStatusRow[] = [
    {
      icon: Shield,
      label: 'Community guidelines',
      status: guidelinesStatus,
      labelText: guidelinesStatus === 'verified' && guidelinesAcceptedAt
        ? `Accepted ${new Date(guidelinesAcceptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : guidelinesStatus === 'verified'
          ? 'Verified'
          : 'Not accepted',
    },
    {
      icon: FileCheck,
      label: 'Insurance proof',
      status: insuranceStatus,
      labelText: insuranceStatus === 'verified' ? 'Uploaded' : 'Not uploaded',
    },
    {
      icon: Search,
      label: 'Background check',
      status: backgroundCheckStatus === 'verified' ? 'verified' : backgroundCheckStatus === 'pending' ? 'pending' : 'not_started',
      labelText: backgroundCheckStatus === 'verified' ? 'Verified' : backgroundCheckStatus === 'pending' ? 'Pending' : 'Not started',
    },
    {
      icon: Award,
      label: 'Account standing',
      status: accountStanding === 'good' ? 'good' : 'warning',
      labelText: accountStanding === 'good' ? 'Good' : 'Warning',
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <row.icon size={20} className="shrink-0 text-muted" strokeWidth={1.5} />
            <span className="text-sm font-medium text-text truncate">{row.label}</span>
          </div>
          <StatusChip status={row.status} label={row.labelText} className="shrink-0" />
        </div>
      ))}
    </div>
  );
}
