'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

/**
 * Export Verified Badge Page
 * Service pros can preview/export a shareable profile badge (non-verified placeholder)
 */
export default function VerifiedBadgePage() {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'pdf' | 'svg'>('png');

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text mb-2">
            Export Profile Badge
          </h1>
          <Label>SHAREABLE PROFILE (PREVIEW)</Label>
        </div>

        {/* Badge Preview */}
        <Card withRail className="mb-6">
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 bg-surface border border-hairline shadow-card rounded-[18px] px-6 py-4 mb-6">
              <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center text-text">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-xl text-text mb-1">Badge export is coming soon</div>
                <div className="flex flex-wrap gap-2">
                  <OfficialBadge>PROFILE</OfficialBadge>
                  <OfficialBadge>ON FILE</OfficialBadge>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted">
              We removed the demo “verified badge” data. When verification and exports are wired up, your real badge will preview here.
            </p>
          </div>
        </Card>

        <div className="mb-6">
          <Label className="mb-4 block">PROFILE DETAILS</Label>
          <Card withRail className="border-l-[3px] border-l-accent">
            <div className="space-y-2">
              <div className="font-semibold text-text">No verified items yet</div>
              <p className="text-sm text-muted">
                Verification status will display here once your profile and documents are connected.
              </p>
            </div>
          </Card>
        </div>

        {/* Export Options */}
        <Card withRail>
          <Label className="mb-4 block">EXPORT OPTIONS</Label>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Export Format
              </label>
              <div className="flex gap-3">
                {(['png', 'pdf', 'svg'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`px-4 py-2 rounded-2xl border transition-all uppercase text-sm font-medium ${
                      selectedFormat === format
                        ? 'border-badgeBorder bg-badgeFill text-text'
                        : 'border-hairline text-muted hover:text-text'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button className="w-full" disabled>
                EXPORT VERIFIED BADGE →
              </Button>
              <p className="mt-2 text-xs text-muted/70">Export will be enabled after verification is live.</p>
            </div>
          </div>
        </Card>

        {/* Usage Instructions */}
        <Card className="mt-6 bg-surface2">
          <Label className="mb-4 block">HOW TO USE</Label>
          <div className="space-y-3 text-sm text-text">
            <div className="flex items-start gap-3">
              <span className="text-accent font-bold">1.</span>
              <p>Export your verified badge in your preferred format (PNG, PDF, or SVG)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent font-bold">2.</span>
              <p>Use the badge on your website, business cards, or marketing materials</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent font-bold">3.</span>
              <p>The badge shows your verified status and builds trust with customers</p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}












