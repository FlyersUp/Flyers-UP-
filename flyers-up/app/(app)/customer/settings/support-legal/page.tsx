'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SectionHeader } from '@/components/settings/SectionHeader';
import { LegalLinksList } from '@/components/settings/LegalLinksList';
import { SupportMessageForm } from '@/components/settings/SupportMessageForm';
import { Mail, HelpCircle, AlertCircle } from 'lucide-react';

export default function CustomerSupportLegalPage() {
  const messageFormRef = useRef<HTMLDivElement>(null);

  function scrollToForm() {
    messageFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>

          <div>
            <h1 className="text-2xl font-semibold text-text">Support & Legal</h1>
            <p className="mt-1 text-sm text-muted">Help, policies, and account paperwork.</p>
          </div>

          {/* Quick help */}
          <SettingsCard>
            <SectionHeader label="Quick help" />
            <div className="space-y-2">
              <a
                href="mailto:support@flyersup.app?subject=Flyers%20Up%20Support%20(Customer)"
                className="flex items-center gap-3 p-4 rounded-xl border border-black/5 hover:bg-black/[0.02] hover:border-black/10 transition-colors"
              >
                <Mail size={20} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text">Contact support</div>
                  <div className="text-xs text-muted">support@flyersup.app</div>
                </div>
                <span className="text-muted text-xs">→</span>
              </a>
              <Link
                href="/customer/settings/help-support"
                className="flex items-center gap-3 p-4 rounded-xl border border-black/5 hover:bg-black/[0.02] hover:border-black/10 transition-colors"
              >
                <HelpCircle size={20} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text">Help center</div>
                  <div className="text-xs text-muted">FAQs + common fixes</div>
                </div>
                <span className="text-muted text-xs">→</span>
              </Link>
              <button
                type="button"
                onClick={scrollToForm}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-black/5 hover:bg-black/[0.02] hover:border-black/10 transition-colors text-left"
              >
                <AlertCircle size={20} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text">Report a problem</div>
                  <div className="text-xs text-muted">Send a message to support</div>
                </div>
                <span className="text-muted text-xs">→</span>
              </button>
            </div>
          </SettingsCard>

          {/* Legal documents */}
          <SettingsCard>
            <SectionHeader label="Legal documents" />
            <LegalLinksList />
          </SettingsCard>

          {/* Support contact */}
          <SettingsCard>
            <SectionHeader label="Support contact" />
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-text">Email:</span>{' '}
                <a href="mailto:support@flyersup.app" className="text-accent hover:underline">
                  support@flyersup.app
                </a>
              </p>
              <p className="text-muted">Typically within 24 hours</p>
            </div>
          </SettingsCard>

          {/* Message form */}
          <div ref={messageFormRef}>
            <SettingsCard>
              <SectionHeader label="Message support" />
              <SupportMessageForm role="customer" />
            </SettingsCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
