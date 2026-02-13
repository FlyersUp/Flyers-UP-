'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'pro' | 'customer';

type MenuItem = {
  label: string;
  href?: string | null;
  disabled?: boolean;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

function Section({ title, items, onNavigate }: { title: string; items: MenuItem[]; onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      <div
        className={[
          'inline-flex w-full items-center justify-between',
          'pb-2 mb-1',
          'text-sm font-semibold tracking-wide text-text uppercase',
          'border-b border-[var(--surface-border)]',
        ].join(' ')}
      >
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {items.map((it) => {
          const disabled = Boolean(it.disabled || !it.href);
          const row = (
            <div
              className={[
                'flex items-center justify-between gap-3 rounded-xl px-3 py-2',
                'transition-colors',
                disabled ? 'text-muted/50 cursor-not-allowed' : 'text-text hover:bg-surface2',
              ].join(' ')}
              title={disabled ? 'Coming soon' : undefined}
            >
              <span className="text-sm font-medium">{it.label}</span>
              <span className="text-muted" aria-hidden>
                ›
              </span>
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

function getProMenu(): MenuSection[] {
  return [
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
        { label: 'Jobs', href: '/pro' },
        { label: 'Requests', href: '/pro/requests' },
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
      title: 'Trust & Standing',
      items: [
        { label: 'Trust & Standing', href: '/pro/verified-badge' },
        { label: 'Reviews & Ratings', href: '/pro/profile', disabled: true },
        { label: 'Disputes', href: '/pro/settings/support-legal', disabled: true },
        { label: 'Platform Policies', href: '/pro/settings/support-legal' },
      ],
    },
    {
      title: 'Growth',
      items: [
        { label: 'Insights', href: '/pro', disabled: true },
        { label: 'Improve Visibility', href: '/pro', disabled: true },
        { label: 'Education / Best Practices', href: '/settings/help-support', disabled: true },
      ],
    },
    {
      title: 'Support & System',
      items: [
        { label: 'Help Center', href: '/pro/settings/help-support' },
        { label: 'Contact Support', href: '/pro/settings/help-support' },
        { label: 'Announcements / System Updates', href: '/pro/notifications' },
        { label: 'Legal & Terms', href: '/pro/settings/support-legal' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Notifications', href: '/pro/settings/notifications' },
        { label: 'Privacy', href: '/pro/settings/privacy-security' },
        { label: 'Security', href: '/pro/settings/account-identity' },
        { label: 'Connected Accounts', href: '/pro/settings/payments-payouts' },
      ],
    },
  ];
}

function getCustomerMenu(): MenuSection[] {
  return [
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
        { label: 'Upcoming Bookings', href: '/customer', disabled: true },
        { label: 'Past Bookings', href: '/customer', disabled: true },
        { label: 'Saved Pros', href: '/customer', disabled: true },
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
        { label: 'Browse Services', href: '/customer/categories' },
        { label: 'Nearby Pros', href: '/customer/categories' },
        { label: 'Favorites', href: '/customer/settings/booking-preferences', disabled: true },
      ],
    },
    {
      title: 'Payments',
      items: [
        { label: 'Payment History', href: '/customer/settings/payments', disabled: true },
        { label: 'Receipts', href: '/customer/settings/payments', disabled: true },
        { label: 'Refunds', href: '/customer/settings/payments', disabled: true },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', href: '/customer/settings/help-support' },
        { label: 'Contact Support', href: '/customer/settings/help-support' },
        { label: 'Safety & Policies', href: '/customer/settings/support-legal' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Notifications', href: '/customer/settings/notifications' },
        { label: 'Privacy', href: '/customer/settings/privacy-security' },
        { label: 'Security', href: '/customer/settings/privacy-security' },
        { label: 'Logout', href: null, disabled: true },
      ],
    },
  ];
}

export function SideMenu({
  open,
  onClose,
  mode,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  userName: string;
}) {
  const router = useRouter();
  const openedAtRef = useRef<number>(0);
  const [identity, setIdentity] = useState<{ email: string | null; idShort: string | null }>({
    email: null,
    idShort: null,
  });

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
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

  const roleLabel = mode === 'pro' ? 'Pro' : 'Customer';
  const sections = mode === 'pro' ? getProMenu() : getCustomerMenu();

  async function handleLogout() {
    await supabase.auth.signOut();
    onClose();
    router.replace('/auth');
  }

  if (!open) return null;

  return (
    <div
      className="z-[60]"
      // Inline positioning avoids any Tailwind/CSS edge cases and guarantees the menu overlays.
      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
    >
      <aside
        className="w-[22rem] max-w-[92vw] bg-[var(--surface-solid)] text-text shadow-card border-r border-[var(--surface-border)]"
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 61 }}
      >
        <div className="h-full flex flex-col">
          <div className="px-[var(--panel-pad-x)] py-[var(--panel-pad-y)] border-b border-hairline">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-text">{userName}</div>
                <div className="text-sm text-muted">{roleLabel}</div>
                {identity.email || identity.idShort ? (
                  <div className="mt-1 text-xs text-muted/70">
                    {identity.email ?? '—'}{identity.idShort ? ` • ${identity.idShort}` : ''}
                  </div>
                ) : null}
              </div>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-surface2 text-text hover:bg-surface2/80 transition-colors border border-hairline"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-[var(--panel-pad-x)] py-[var(--panel-pad-y)]">
            <div className="space-y-[var(--stack-gap)]">
              {sections.map((s) => (
                <Section key={s.title} title={s.title} items={s.items} onNavigate={onClose} />
              ))}
            </div>
          </div>

          <div className="px-[var(--panel-pad-x)] py-4 border-t border-hairline">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={mode === 'pro' ? '/pro/messages' : '/customer/messages'}
                className="text-sm font-medium text-muted hover:text-text transition-colors"
                onClick={onClose}
              >
                Messages
              </Link>
              <button
                onClick={() => void handleLogout()}
                className="text-sm font-semibold text-text hover:opacity-90 transition-opacity"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop covers only the area *outside* the panel so it can't block panel clicks. */}
      <button
        className="bg-black/35"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 'min(22rem, 92vw)',
          zIndex: 60,
        }}
        onClick={() => {
          // Prevent the opening click from immediately closing the menu
          // (can happen due to click timing + backdrop mounting).
          if (Date.now() - openedAtRef.current < 250) return;
          onClose();
        }}
        aria-label="Close menu"
      />
    </div>
  );
}

