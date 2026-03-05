'use client';

import { Shield, FileCheck, Search, CreditCard, CheckCircle2, BadgeCheck } from 'lucide-react';
import type { ProTrustInfo } from '@/lib/profileData';

interface TrustBadgesRowProps {
  trust: ProTrustInfo;
}

type BadgeStatus = 'verified' | 'pending' | 'not_started';

function statusLabel(status: BadgeStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending';
    default:
      return 'Not started';
  }
}

function statusClass(status: BadgeStatus): string {
  switch (status) {
    case 'verified':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'pending':
      return 'bg-amber-50 text-amber-800 border-amber-200/60';
    default:
      return 'bg-black/5 text-black/60 border-black/10';
  }
}

export function TrustBadgesRow({ trust }: TrustBadgesRowProps) {
  const guidelinesStatus: BadgeStatus = trust.guidelinesAccepted ? 'verified' : 'not_started';
  const insuranceStatus: BadgeStatus = trust.insuranceDocPath ? 'verified' : 'not_started';
  const bgCheckStatus: BadgeStatus =
    trust.backgroundChecked ?? (trust.backgroundCheckStatus === 'verified')
      ? 'verified'
      : trust.backgroundCheckStatus === 'pending'
        ? 'pending'
        : 'not_started';

  const verifiedBadges = [
    trust.identityVerified && { icon: CheckCircle2, label: 'Verified', status: 'verified' as BadgeStatus },
    trust.backgroundChecked && { icon: Search, label: 'Background Checked', status: 'verified' as BadgeStatus },
    trust.licensed && { icon: BadgeCheck, label: 'Licensed', status: 'verified' as BadgeStatus },
    typeof trust.jobsCompleted === 'number' && trust.jobsCompleted >= 100 && {
      icon: Shield,
      label: `${trust.jobsCompleted}+ Jobs`,
      status: 'verified' as BadgeStatus,
    },
  ].filter(Boolean);
  const standardBadges = [
    { icon: Shield, label: 'Guidelines accepted', status: guidelinesStatus },
    { icon: FileCheck, label: 'Insurance on file', status: insuranceStatus },
    ...(!trust.backgroundChecked ? [{ icon: Search, label: 'Background check', status: bgCheckStatus }] : []),
    { icon: CreditCard, label: 'Payments protected', status: 'verified' as BadgeStatus },
  ];
  const badges = [...verifiedBadges, ...standardBadges] as Array<{ icon: typeof Shield; label: string; status: BadgeStatus }>;

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-2 rounded-xl border border-black/5 bg-white/50 px-3 py-2"
        >
          <b.icon size={16} className="shrink-0 text-black/50" strokeWidth={1.5} />
          <span className="text-xs font-medium text-black/70">{b.label}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(b.status)}`}
          >
            {statusLabel(b.status)}
          </span>
        </div>
      ))}
    </div>
  );
}
