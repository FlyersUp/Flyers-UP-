'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type Role = 'customer' | 'pro';

type MenuItem = {
  label: string;
  href?: string | null;
  disabled?: boolean;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const CUSTOMER_SECTIONS: MenuSection[] = [
  {
    title: 'Role',
    items: [{ label: 'Switch role', href: '/onboarding/role?switch=1&next=%2Fcustomer' }],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/customer/settings/account-profile' },
      { label: 'Addresses', href: '/customer/settings/addresses' },
      { label: 'Payment Methods', href: '/customer/settings/payment-methods' },
      { label: 'Preferences', href: '/customer/settings/booking-preferences' },
    ],
  },
  {
    title: 'Bookings',
    items: [
      { label: 'Bookings', href: '/customer/bookings' },
      { label: 'Requests', href: '/customer/requests' },
      { label: 'Saved Pros', href: '/customer/categories' },
      { label: 'Booking Rules', href: '/booking-rules' },
    ],
  },
  {
    title: 'Protection & Trust',
    items: [
      { label: 'Verified Pros Explained', href: '/customer/categories' },
      { label: 'Disputes & Support', href: '/customer/settings/help-support' },
    ],
  },
  {
    title: 'Discovery',
    items: [
      { label: 'Flyer Wall', href: '/flyer-wall' },
      { label: 'Browse Occupations', href: '/occupations' },
      { label: 'Nearby Pros', href: '/customer/categories' },
      { label: 'Favorites', href: '/customer/favorites' },
    ],
  },
  {
    title: 'Payments',
    items: [
      { label: 'Payment History', href: '/customer/settings/payments' },
      { label: 'Receipts', href: '/customer/settings/payments' },
      { label: 'Refunds', href: '/customer/settings/payments' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Center', href: '/customer/settings/help-support' },
      { label: 'Contact Support', href: '/customer/settings/help-support' },
      { label: 'Booking Rules', href: '/booking-rules' },
      { label: 'Safety & Policies', href: '/customer/settings/support-legal' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Notifications', href: '/customer/settings/notifications' },
      { label: 'Privacy', href: '/customer/settings/privacy-security' },
      { label: 'Security', href: '/customer/settings/privacy-security' },
      { label: 'Two-Factor Authentication', href: '/customer/settings/privacy-security#2fa' },
      { label: 'Your Data', href: '/customer/settings/privacy-security#your-data' },
      { label: 'Logout', href: null, disabled: true },
    ],
  },
];

const PRO_SECTIONS: MenuSection[] = [
  {
    title: 'Role',
    items: [{ label: 'Switch role', href: '/onboarding/role?switch=1&next=%2Fpro' }],
  },
  {
    title: 'Account & Identity',
    items: [
      { label: 'Profile', href: '/pro/profile' },
      { label: 'Business Info', href: '/pro/settings/business-profile' },
      { label: 'Credentials & Licenses', href: '/pro/credentials' },
      { label: 'Insurance', href: '/pro/settings/safety-compliance' },
      { label: 'Verification Status', href: '/pro/verified-badge' },
    ],
  },
  {
    title: 'Work & Operations',
    items: [
      { label: 'Bookings', href: '/pro/bookings' },
      { label: 'Booking Rules', href: '/booking-rules' },
      { label: 'Jobs', href: '/pro/jobs' },
      { label: 'Today (Detailed View)', href: '/pro/today' },
      { label: 'Availability', href: '/pro/settings/pricing-availability' },
      { label: 'Service Areas', href: '/pro/settings/business-profile' },
      { label: 'Pricing & Services', href: '/pro/settings/pricing-availability' },
      { label: 'Calendar', href: '/pro/today', disabled: true },
    ],
  },
  {
    title: 'Earnings & Finance',
    items: [
      { label: 'Earnings Overview', href: '/pro/earnings' },
      { label: 'Payouts', href: '/pro/settings/payments-payouts' },
      { label: 'Tax Documents', href: '/settings/payments', disabled: true },
      { label: 'Payment Settings', href: '/pro/settings/payments-payouts' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Insights', href: '/pro', disabled: true },
      { label: 'Improve Visibility', href: '/pro', disabled: true },
      { label: 'Education / Best Practices', href: '/settings/help-support', disabled: true },
      { label: 'Trust & Standing', href: '/pro/verified-badge' },
      { label: 'Reviews & Ratings', href: '/pro/profile', disabled: true },
      { label: 'Disputes', href: '/pro/settings/support-legal', disabled: true },
      { label: 'Platform Policies', href: '/pro/settings/support-legal' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Notifications', href: '/pro/settings/notifications' },
      { label: 'Privacy', href: '/pro/settings/privacy-security' },
      { label: 'Security', href: '/pro/settings/account-identity' },
      { label: 'Two-Factor Authentication', href: '/pro/settings/privacy-security#2fa' },
      { label: 'Your Data', href: '/pro/settings/privacy-security#your-data' },
      { label: 'Connected Accounts', href: '/pro/settings/payments-payouts' },
      { label: 'Help Center', href: '/pro/settings/help-support' },
      { label: 'Contact Support', href: '/pro/settings/help-support' },
      { label: 'Announcements / System Updates', href: '/pro/notifications' },
      { label: 'Legal & Terms', href: '/pro/settings/support-legal' },
    ],
  },
];

const SUBTITLE_COLORS = {
  customer: '#7FAF8F',
  pro: '#D89A5B',
} as const;

const NEUTRAL_SUBTITLE = '#6B6B69';

function Section({
  title,
  items,
  onNavigate,
  subtitleColor,
}: {
  title: string;
  items: MenuItem[];
  onNavigate: () => void;
  subtitleColor: string;
}) {
  return (
    <div className="mb-8">
      <div
        className="text-[0.95rem] font-semibold uppercase tracking-[0.03em]"
        style={{ color: subtitleColor }}
      >
        {title}
      </div>
      <div className="mt-3 border-t border-[#D8D8D2] dark:border-white/10" />
      <div className="mt-2">
        {items.map((it) => {
          const disabled = Boolean(it.disabled || !it.href);
          const row = (
            <div
              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition ${
                disabled
                  ? 'cursor-not-allowed opacity-60 text-[#4A4A48] dark:text-gray-400'
                  : 'text-[#1F2937] dark:text-gray-100 hover:bg-black/[0.03] dark:hover:bg-white/10 active:bg-black/[0.05] dark:active:bg-white/15'
              }`}
              title={disabled ? 'Coming soon' : undefined}
            >
              <span className="text-[1.1rem] font-medium">{it.label}</span>
              <ChevronRight size={20} className="flex-shrink-0 text-[#8C93A1] dark:text-gray-500" aria-hidden />
            </div>
          );

          if (disabled) return <div key={it.label}>{row}</div>;
          return (
            <Link key={it.label} href={it.href!} className="block" onClick={onNavigate}>
              {row}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SideMenu({
  open,
  onClose,
  role,
  mode,
  userName = 'Account',
}: {
  open: boolean;
  onClose: () => void;
  role?: Role;
  /** @deprecated Use `role` instead. Kept for backward compatibility. */
  mode?: Role;
  userName?: string;
}) {
  const resolvedRole = role ?? mode ?? 'customer';
  const router = useRouter();
  const openedAtRef = useRef<number>(0);
  const [identity, setIdentity] = useState<{ email: string | null; idShort: string | null }>({
    email: null,
    idShort: null,
  });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      openedAtRef.current = Date.now();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!mounted) return;
        setIdentity({
          email: user?.email ?? null,
          idShort: user?.id ? `${user.id.slice(0, 6)}…` : null,
        });
      } catch {
        if (!mounted) return;
        setIdentity({ email: null, idShort: null });
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [open]);

  const roleLabel = resolvedRole === 'pro' ? 'Pro' : 'Customer';
  const baseSections = resolvedRole === 'pro' ? PRO_SECTIONS : CUSTOMER_SECTIONS;
  const subtitleColor = SUBTITLE_COLORS[resolvedRole];
  const isCanonicalAdmin =
    identity.email?.trim().toLowerCase() === 'hello.flyersup@gmail.com';
  const adminSection: MenuSection[] = isCanonicalAdmin
    ? [{ title: 'Admin', items: [{ label: 'Switch to Admin', href: '/admin' }] }]
    : [];
  const sections = [...adminSection, ...baseSections];

  async function handleLogout() {
    await supabase.auth.signOut();
    onClose();
    router.replace('/');
  }

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop overlay */}
      <button
        className={`absolute inset-0 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ease-out ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => {
          if (Date.now() - openedAtRef.current < 250) return;
          onClose();
        }}
        aria-label="Close menu"
      />

      {/* Drawer panel - right-side slide-in */}
      <aside
        className={`fixed right-0 top-0 z-[61] h-dvh w-[86%] max-w-[430px] flex flex-col shadow-2xl transition-transform duration-300 ease-out
          bg-[#F7F7F4] dark:bg-[#1C1E24] text-[#1F2937] dark:text-gray-100
          border-l border-black/5 dark:border-white/10`}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 border-b border-[#D8D8D2] dark:border-white/10 px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.9rem] font-semibold tracking-[-0.02em] text-[#1F2937] dark:text-white truncate">
                {userName}
              </h2>
              <p className="mt-1 text-[1.05rem] text-[#667085] dark:text-gray-400 capitalize">
                {roleLabel}
              </p>
              {(identity.email || identity.idShort) && (
                <p className="mt-1 truncate text-[0.98rem] text-[#6B7280] dark:text-gray-500">
                  {identity.email ?? '—'}
                  {identity.idShort ? ` • ${identity.idShort}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 h-14 w-14 rounded-full border border-[#D9D9D9] dark:border-white/10 bg-[#EFEFEF] dark:bg-white/10 text-[#1F2937] dark:text-white
                hover:bg-[#E7E7E7] dark:hover:bg-white/15 active:bg-[#DFDFDF] dark:active:bg-white/20
                transition-colors flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
          {sections.map((s) => (
            <Section
              key={s.title}
              title={s.title}
              items={s.items}
              onNavigate={onClose}
              subtitleColor={s.title === 'Admin' ? NEUTRAL_SUBTITLE : subtitleColor}
            />
          ))}
        </div>

        {/* Footer with Messages + Logout */}
        <div className="flex-shrink-0 border-t border-[#D8D8D2] dark:border-white/10 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={resolvedRole === 'pro' ? '/pro/messages' : '/customer/messages'}
              className="text-[1.1rem] font-medium text-[#667085] dark:text-gray-400 hover:text-[#1F2937] dark:hover:text-white transition-colors"
              onClick={onClose}
            >
              Messages
            </Link>
            <button
              onClick={() => void handleLogout()}
              className="rounded-2xl px-4 py-4 text-[1.1rem] font-semibold text-[#1F2937] dark:text-white transition hover:bg-black/[0.03] dark:hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
