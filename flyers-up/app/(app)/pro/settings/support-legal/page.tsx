'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PlacardHeader } from '@/components/ui/PlacardHeader';
import { TrustRow } from '@/components/ui/TrustRow';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export default function ProSupportLegalSettingsPage() {
  const [message, setMessage] = useState('');
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <div className="mt-3">
            <PlacardHeader title="Support & Legal" subtitle="Help, policies, and account paperwork." tone="info" />
          </div>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <Card withRail>
          <Label>HELP + PAPERWORK</Label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              className="block p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              href={`mailto:support@flyersup.app?subject=${encodeURIComponent('Flyers Up Support (Pro)')}&body=${encodeURIComponent(message)}`}
            >
              <div className="font-medium text-text">Contact support</div>
              <div className="text-sm text-muted">Email support@flyersup.app</div>
            </a>
            <Link
              href="/pro/settings/help-support"
              className="block p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
            >
              <div className="font-medium text-text">Help center</div>
              <div className="text-sm text-muted">FAQs + common fixes</div>
            </Link>
            <Link
              className="block p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              href="/terms"
            >
              <div className="font-medium text-text">Terms of service</div>
              <div className="text-sm text-muted">View terms</div>
            </Link>
            <Link
              className="block p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              href="/privacy"
            >
              <div className="font-medium text-text">Privacy policy</div>
              <div className="text-sm text-muted">View privacy</div>
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <Textarea
              label="Message to support (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Tell us what you’re trying to do and what’s going wrong..."
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  try {
                    void navigator.clipboard.writeText(message);
                  } catch {
                    // ignore
                  }
                }}
              >
                Copy message →
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/pro/settings/help-support" className="block">
            <Card withRail>
              <Label>HELP CENTER</Label>
              <p className="mt-3 text-sm text-muted">FAQs + contact (current UI).</p>
            </Card>
          </Link>
          <Link href="/pro/settings/privacy-security" className="block">
            <Card withRail>
              <Label>PRIVACY &amp; SECURITY</Label>
              <p className="mt-3 text-sm text-muted">Password + account controls (current UI).</p>
            </Card>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

