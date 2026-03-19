'use client';

/**
 * Booking Rules Page
 * Explains how bookings, payments, and confirmations work.
 * Accessible from sidebar, settings, and checkout footer.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import {
  FileText,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  Timer,
  Banknote,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

const RULES = [
  {
    icon: FileText,
    title: 'Booking Request',
    body: 'Customers request a job by filling out the booking form. The service pro reviews and accepts before any payment is required.',
  },
  {
    icon: Clock,
    title: 'Deposit Required (30 Minutes)',
    body: 'Once the pro accepts, you have 30 minutes to pay the deposit. If the deposit is not paid within this window, the booking is automatically cancelled.',
  },
  {
    icon: MapPin,
    title: 'Job Progress Updates',
    body: 'The pro updates the job status as they work: On the way, Working now, and Completed. You can track progress in real time.',
  },
  {
    icon: CreditCard,
    title: 'Remaining Payment',
    body: 'The remaining balance is due after the pro marks the job as completed. You will receive a notification with a link to pay.',
  },
  {
    icon: CheckCircle2,
    title: 'Confirm Completion',
    body: 'Once you are satisfied with the work, confirm completion on the booking page. This releases the payment to the pro.',
  },
  {
    icon: Timer,
    title: 'Auto Confirmation (24 Hours)',
    body: 'If you do not confirm within 24 hours after the pro marks complete—and the remaining payment has been made—the system automatically confirms the booking.',
  },
  {
    icon: Banknote,
    title: 'Pro Gets Paid',
    body: 'Pros keep 100% of their service price. Customers pay a separate Flyers Up Protection & Service Fee for secure payments, booking protection, and support.',
  },
  {
    icon: AlertCircle,
    title: 'Late Payments',
    body: 'If a payment is made after a booking has been cancelled, the system automatically refunds the amount to you.',
  },
  {
    icon: MessageCircle,
    title: 'Disputes',
    body: 'If there is a problem with your booking, contact support through the app. We review the timeline, messages, and photos to work with both parties to resolve the issue.',
  },
];

function getModeFromPath(pathname: string | null): 'customer' | 'pro' | null {
  if (pathname?.startsWith('/pro') || pathname?.startsWith('/dashboard/pro')) return 'pro';
  if (pathname?.startsWith('/customer') || pathname?.startsWith('/dashboard/customer')) return 'customer';
  return null;
}

export default function BookingRulesPage() {
  const pathname = usePathname();
  const pathMode = getModeFromPath(pathname);
  const [storageMode, setStorageMode] = useState<'customer' | 'pro'>('customer');
  const mode = pathMode ?? storageMode;

  useEffect(() => {
    if (pathMode != null) return;
    const id = setTimeout(() => {
      try {
        const last = window.localStorage.getItem('flyersup:lastRole');
        if (last === 'pro' || last === 'customer') setStorageMode(last);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, [pathMode]);

  return (
    <AppLayout mode={mode}>
      <div className="max-w-[760px] mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        <h1 className="text-2xl font-semibold text-text mb-1">
          Booking Rules
        </h1>
        <p className="text-muted mb-8">
          How bookings, deposits, remaining payments, and confirmations work.
        </p>

        <div className="space-y-4">
          {RULES.map((rule, i) => (
            <Card key={i} withRail className="flex gap-4">
              <div className="shrink-0 mt-0.5 text-muted">
                <rule.icon size={20} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text mb-1">
                  {rule.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed">
                  {rule.body}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted mt-8 pt-6 border-t border-[var(--surface-border)]">
          By using Flyers Up, customers and service pros agree to follow these booking rules.
        </p>
      </div>
    </AppLayout>
  );
}
