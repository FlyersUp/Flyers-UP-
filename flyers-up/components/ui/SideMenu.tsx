'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';

type Role = 'customer' | 'pro';

type MenuItem = {
  labelKey: string;
  href?: string | null;
  disabled?: boolean;
};

type MenuSection = {
  titleKey: string;
  items: MenuItem[];
};

const CUSTOMER_SECTIONS: MenuSection[] = [
  {
    titleKey: 'sidebar.role',
    items: [{ labelKey: 'sidebar.switchRole', href: '/onboarding/role?switch=1&next=%2Fcustomer' }],
  },
  {
    titleKey: 'sidebar.account',
    items: [
      { labelKey: 'sidebar.customer.profile', href: '/customer/settings/account-profile' },
      { labelKey: 'sidebar.customer.addresses', href: '/customer/settings/addresses' },
      { labelKey: 'sidebar.customer.paymentMethods', href: '/customer/settings/payment-methods' },
      { labelKey: 'sidebar.customer.preferences', href: '/customer/settings/booking-preferences' },
    ],
  },
  {
    titleKey: 'sidebar.bookings',
    items: [
      { labelKey: 'sidebar.customer.bookings', href: '/customer/bookings' },
      { labelKey: 'sidebar.customer.requests', href: '/customer/requests' },
      { labelKey: 'sidebar.customer.savedPros', href: '/customer/favorites' },
      { labelKey: 'sidebar.customer.bookingRules', href: '/booking-rules' },
    ],
  },
  {
    titleKey: 'sidebar.protection',
    items: [
      { labelKey: 'sidebar.customer.verifiedProsExplained', href: '/occupations' },
      { labelKey: 'sidebar.customer.disputesSupport', href: '/customer/settings/help-support' },
    ],
  },
  {
    titleKey: 'sidebar.discovery',
    items: [
      { labelKey: 'sidebar.customer.flyerWall', href: '/flyer-wall' },
      { labelKey: 'sidebar.customer.browseOccupations', href: '/occupations' },
      { labelKey: 'sidebar.customer.nearbyPros', href: '/occupations' },
      { labelKey: 'sidebar.customer.favorites', href: '/customer/favorites' },
    ],
  },
  {
    titleKey: 'sidebar.payments',
    items: [
      { labelKey: 'sidebar.customer.paymentHistory', href: '/customer/settings/payments' },
      { labelKey: 'sidebar.customer.receipts', href: '/customer/settings/payments' },
      { labelKey: 'sidebar.customer.refunds', href: '/customer/settings/payments' },
    ],
  },
  {
    titleKey: 'sidebar.support',
    items: [
      { labelKey: 'sidebar.customer.helpCenter', href: '/customer/settings/help-support' },
      { labelKey: 'sidebar.customer.contactSupport', href: '/customer/settings/help-support' },
      { labelKey: 'sidebar.customer.bookingRules', href: '/booking-rules' },
      { labelKey: 'sidebar.customer.safetyPolicies', href: '/customer/settings/support-legal' },
    ],
  },
  {
    titleKey: 'sidebar.settings',
    items: [
      { labelKey: 'sidebar.customer.notifications', href: '/customer/settings/notifications' },
      { labelKey: 'sidebar.customer.privacy', href: '/customer/settings/privacy-security' },
      { labelKey: 'sidebar.customer.security', href: '/customer/settings/privacy-security' },
      { labelKey: 'sidebar.customer.twoFactor', href: '/customer/settings/privacy-security#2fa' },
      { labelKey: 'sidebar.customer.yourData', href: '/customer/settings/privacy-security#your-data' },
      { labelKey: 'sidebar.logout', href: null, disabled: true },
    ],
  },
];

const PRO_SECTIONS: MenuSection[] = [
  {
    titleKey: 'sidebar.role',
    items: [{ labelKey: 'sidebar.switchRole', href: '/onboarding/role?switch=1&next=%2Fpro' }],
  },
  {
    titleKey: 'sidebar.accountIdentity',
    items: [
      { labelKey: 'sidebar.pro.profile', href: '/pro/profile' },
      { labelKey: 'sidebar.pro.businessInfo', href: '/pro/settings/business-profile' },
      { labelKey: 'sidebar.pro.credentialsLicenses', href: '/pro/credentials' },
      { labelKey: 'sidebar.pro.insurance', href: '/pro/settings/safety-compliance' },
      { labelKey: 'sidebar.pro.verificationStatus', href: '/pro/verified-badge' },
    ],
  },
  {
    titleKey: 'sidebar.workOperations',
    items: [
      { labelKey: 'sidebar.pro.bookings', href: '/pro/bookings' },
      { labelKey: 'sidebar.pro.bookingRules', href: '/booking-rules' },
      { labelKey: 'sidebar.pro.jobs', href: '/pro/jobs' },
      { labelKey: 'sidebar.pro.today', href: '/pro/today' },
      { labelKey: 'sidebar.pro.availability', href: '/pro/settings/pricing-availability' },
      { labelKey: 'sidebar.pro.serviceAreas', href: '/pro/settings/business-profile' },
      { labelKey: 'sidebar.pro.pricingServices', href: '/pro/settings/pricing-availability' },
      { labelKey: 'sidebar.pro.calendar', href: '/pro/today', disabled: true },
    ],
  },
  {
    titleKey: 'sidebar.pro.earningsFinance',
    items: [
      { labelKey: 'sidebar.pro.earningsOverview', href: '/pro/earnings' },
      { labelKey: 'sidebar.pro.payouts', href: '/pro/settings/payments-payouts' },
      { labelKey: 'sidebar.pro.taxDocuments', href: '/settings/payments', disabled: true },
      { labelKey: 'sidebar.pro.paymentSettings', href: '/pro/settings/payments-payouts' },
    ],
  },
  {
    titleKey: 'sidebar.growth',
    items: [
      { labelKey: 'sidebar.pro.insights', href: '/pro', disabled: true },
      { labelKey: 'sidebar.pro.improveVisibility', href: '/pro', disabled: true },
      { labelKey: 'sidebar.pro.educationBestPractices', href: '/settings/help-support', disabled: true },
      { labelKey: 'sidebar.pro.trustStanding', href: '/pro/verified-badge' },
      { labelKey: 'sidebar.pro.reviewsRatings', href: '/pro/profile', disabled: true },
      { labelKey: 'sidebar.pro.disputes', href: '/pro/settings/support-legal', disabled: true },
      { labelKey: 'sidebar.pro.platformPolicies', href: '/pro/settings/support-legal' },
    ],
  },
  {
    titleKey: 'sidebar.settings',
    items: [
      { labelKey: 'sidebar.customer.notifications', href: '/pro/settings/notifications' },
      { labelKey: 'sidebar.customer.privacy', href: '/pro/settings/privacy-security' },
      { labelKey: 'sidebar.customer.security', href: '/pro/settings/account-identity' },
      { labelKey: 'sidebar.customer.twoFactor', href: '/pro/settings/privacy-security#2fa' },
      { labelKey: 'sidebar.customer.yourData', href: '/pro/settings/privacy-security#your-data' },
      { labelKey: 'sidebar.pro.connectedAccounts', href: '/pro/settings/payments-payouts' },
      { labelKey: 'sidebar.customer.helpCenter', href: '/pro/settings/help-support' },
      { labelKey: 'sidebar.customer.contactSupport', href: '/pro/settings/help-support' },
      { labelKey: 'sidebar.pro.announcements', href: '/pro/notifications' },
      { labelKey: 'sidebar.pro.legalTerms', href: '/pro/settings/support-legal' },
    ],
  },
];

const SUBTITLE_COLORS = {
  customer: '#7E8952',
  pro: '#C8854D',
} as const;

const NEUTRAL_SUBTITLE = '#6A644D';

function Section({
  title,
  items,
  onNavigate,
  subtitleColor,
  getLabel,
  comingSoon,
}: {
  title: string;
  items: MenuItem[];
  onNavigate: () => void;
  subtitleColor: string;
  getLabel: (key: string) => string;
  comingSoon: string;
}) {
  return (
    <div className="mb-8">
      <div
        className="text-[0.95rem] font-semibold uppercase tracking-[0.03em]"
        style={{ color: subtitleColor }}
      >
        {title}
      </div>
      <div className="mt-3 border-t border-border" />
      <div className="mt-2">
        {items.map((it) => {
          const disabled = Boolean(it.disabled || !it.href);
          const label = getLabel(it.labelKey);
          const row = (
            <div
              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition ${
                disabled
                  ? 'cursor-not-allowed opacity-60 text-text3'
                  : 'text-text hover:bg-hover/65 active:bg-hover'
              }`}
              title={disabled ? comingSoon : undefined}
            >
              <span className="text-[1.05rem] font-medium">{label}</span>
              <ChevronRight size={20} className="flex-shrink-0 text-text3" aria-hidden />
            </div>
          );

          if (disabled) return <div key={it.labelKey}>{row}</div>;
          return (
            <Link key={it.labelKey} href={it.href!} className="block" onClick={onNavigate}>
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
  role = 'customer',
  userName = 'Account',
}: {
  open: boolean;
  onClose: () => void;
  role?: Role;
  userName?: string;
}) {
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

  const handleClose = () => {
    // Move focus out before closing to avoid "aria-hidden on focused descendant" a11y error
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

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

  const t = useTranslations();
  const roleLabel = role === 'pro' ? t('sidebar.roleLabelPro') : t('sidebar.roleLabelCustomer');
  const baseSections = role === 'pro' ? PRO_SECTIONS : CUSTOMER_SECTIONS;
  const subtitleColor = SUBTITLE_COLORS[role];
  const isCanonicalAdmin =
    identity.email?.trim().toLowerCase() === 'hello.flyersup@gmail.com';
  const adminSection: MenuSection[] = isCanonicalAdmin
    ? [{ titleKey: 'sidebar.admin', items: [{ labelKey: 'sidebar.switchToAdmin', href: '/admin' }] }]
    : [];
  const sections = [...adminSection, ...baseSections];
  const getLabel = (key: string) => t(key);

  async function handleLogout() {
    await supabase.auth.signOut();
    handleClose();
    router.replace('/');
  }

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop overlay */}
      <button
        className={`absolute inset-0 bg-[rgba(58,46,20,0.34)] dark:bg-black/55 transition-opacity duration-300 ease-out ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => {
          if (Date.now() - openedAtRef.current < 250) return;
          onClose();
        }}
        aria-label={t('sidebar.closeMenu')}
      />

      {/* Drawer panel - left-side slide-in */}
      <aside
        className={`fixed left-0 top-0 z-[61] h-dvh w-[86%] max-w-[430px] flex flex-col shadow-[var(--shadow-md)] transition-transform duration-300 ease-out
          bg-surface text-text border-r border-border`}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 border-b border-border px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.9rem] font-semibold tracking-[-0.02em] text-text truncate">
                {userName}
              </h2>
              <p className="mt-1 text-[1.05rem] text-text2 capitalize">
                {roleLabel}
              </p>
              {(identity.email || identity.idShort) && (
                <p className="mt-1 truncate text-[0.98rem] text-text3">
                  {identity.email ?? '—'}
                  {identity.idShort ? ` • ${identity.idShort}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 h-14 w-14 rounded-full border border-border bg-surface2 text-text
                hover:bg-hover active:bg-hover/90
                transition-colors flex items-center justify-center"
              aria-label={t('sidebar.closeMenu')}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
          {sections.map((s) => (
            <Section
              key={s.titleKey}
              title={getLabel(s.titleKey)}
              items={s.items}
              onNavigate={onClose}
              subtitleColor={s.titleKey === 'sidebar.admin' ? NEUTRAL_SUBTITLE : subtitleColor}
              getLabel={getLabel}
              comingSoon={t('common.comingSoon')}
            />
          ))}
        </div>

        {/* Footer with Messages + Logout */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={role === 'pro' ? '/pro/messages' : '/customer/messages'}
              className="text-[1.05rem] font-medium text-text2 hover:text-text transition-colors"
              onClick={handleClose}
            >
              {t('sidebar.messages')}
            </Link>
            <button
              onClick={() => void handleLogout()}
              className="rounded-2xl px-4 py-3.5 text-[1.05rem] font-semibold text-text transition hover:bg-hover"
            >
              {t('sidebar.logout')}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
