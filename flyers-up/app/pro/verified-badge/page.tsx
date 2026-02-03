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

  const verifiedCredentials = [
    { id: '1', name: 'Profile information', status: 'on_file', date: 'Jan 1, 2024', badge: 'PROFILE' },
    { id: '2', name: 'Documents (optional)', status: 'on_file', date: 'Jan 1, 2024', badge: 'ON FILE' },
    { id: '3', name: 'Reviews & ratings', status: 'on_file', date: 'Jan 1, 2024', badge: 'REVIEWS' },
  ];

  const handleExport = () => {
    // Mock export functionality
    alert(`Exporting verified badge as ${selectedFormat.toUpperCase()}...`);
    // In a real app, this would generate and download the badge file
  };

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
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-accentContrast">
                <span className="text-2xl">✓</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-xl text-text mb-1">Sarah Johnson</div>
                <div className="flex flex-wrap gap-2">
                  <OfficialBadge>PROFILE</OfficialBadge>
                  <OfficialBadge>ON FILE</OfficialBadge>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted">
              This is a shareable preview. It does not represent licensing, insurance, or a guarantee.
            </p>
          </div>
        </Card>

        {/* Verified Credentials List */}
        <div className="mb-6">
          <Label className="mb-4 block">PROFILE DETAILS (PREVIEW)</Label>
          <div className="space-y-3">
            {verifiedCredentials.map((cred) => (
              <Card withRail key={cred.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                      <span className="text-xl">✓</span>
                    </div>
                    <div>
                      <div className="font-semibold text-text mb-1">{cred.name}</div>
                      <div className="text-sm text-muted">Updated on {cred.date}</div>
                    </div>
                  </div>
                  <OfficialBadge>{cred.badge}</OfficialBadge>
                </div>
              </Card>
            ))}
          </div>
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
              <Button className="w-full" onClick={handleExport}>
                EXPORT VERIFIED BADGE →
              </Button>
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












