'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

/**
 * Export Verified Badge Page
 * Service pros can view and export their verified badge/credentials
 */
export default function VerifiedBadgePage() {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'pdf' | 'svg'>('png');

  const verifiedCredentials = [
    { id: '1', name: 'Business License', status: 'verified', date: 'Jan 1, 2024', badge: 'VERIFIED PRO' },
    { id: '2', name: 'Insurance Certificate', status: 'verified', date: 'Jan 1, 2024', badge: 'INSURED' },
    { id: '3', name: 'Background Check', status: 'verified', date: 'Jan 1, 2024', badge: 'BACKGROUND CHECKED' },
    { id: '4', name: 'LLC Verification', status: 'verified', date: 'Jan 1, 2024', badge: 'LLC VERIFIED' },
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Export Verified Badge
          </h1>
          <Label>VERIFIED CREDENTIALS</Label>
        </div>

        {/* Badge Preview */}
        <Card withRail className="mb-6">
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 bg-white border-2 border-[#FFD3A1] rounded-xl px-6 py-4 mb-6">
              <div className="w-16 h-16 bg-[#FFD3A1] rounded-full flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-xl text-gray-900 mb-1">Sarah Johnson</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="highlight">VERIFIED PRO</Badge>
                  <Badge variant="highlight">INSURED</Badge>
                  <Badge variant="highlight">BACKGROUND CHECKED</Badge>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              This is how your verified badge will appear
            </p>
          </div>
        </Card>

        {/* Verified Credentials List */}
        <div className="mb-6">
          <Label className="mb-4 block">YOUR VERIFIED CREDENTIALS</Label>
          <div className="space-y-3">
            {verifiedCredentials.map((cred) => (
              <Card withRail key={cred.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FFD3A1]/20 rounded-lg flex items-center justify-center">
                      <span className="text-xl">✓</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{cred.name}</div>
                      <div className="text-sm text-gray-600">Verified on {cred.date}</div>
                    </div>
                  </div>
                  <Badge variant="highlight">{cred.badge}</Badge>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="flex gap-3">
                {(['png', 'pdf', 'svg'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`px-4 py-2 rounded-xl border-2 transition-all uppercase text-sm font-medium ${
                      selectedFormat === format
                        ? 'border-[#FFD3A1] bg-[#FFD3A1]/10 text-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <Button className="w-full" onClick={handleExport}>
                EXPORT VERIFIED BADGE →
              </Button>
            </div>
          </div>
        </Card>

        {/* Usage Instructions */}
        <Card className="mt-6 bg-gray-50">
          <Label className="mb-4 block">HOW TO USE</Label>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-[#FFD3A1] font-bold">1.</span>
              <p>Export your verified badge in your preferred format (PNG, PDF, or SVG)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#FFD3A1] font-bold">2.</span>
              <p>Use the badge on your website, business cards, or marketing materials</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#FFD3A1] font-bold">3.</span>
              <p>The badge shows your verified status and builds trust with customers</p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}









