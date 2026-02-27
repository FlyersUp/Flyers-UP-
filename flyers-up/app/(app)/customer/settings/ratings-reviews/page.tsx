'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { TrustRow } from '@/components/ui/TrustRow';

export default function CustomerRatingsReviewsSettingsPage() {
  const [note, setNote] = useState('');
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Ratings &amp; Reviews</h1>
          <p className="text-muted mt-1">Your reputation too.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <Card withRail>
          <Label>MY REPUTATION</Label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              className="text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              onClick={() => setNote((v) => (v ? v : 'I want to see my reviews history…'))}
            >
              <div className="font-medium text-text">Reviews I’ve left</div>
              <div className="text-sm text-muted">Coming next — tap to draft a request.</div>
            </button>
            <button
              type="button"
              className="text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              onClick={() => setNote((v) => (v ? v : 'I want to see my disputes log…'))}
            >
              <div className="font-medium text-text">Disputes I’ve opened</div>
              <div className="text-sm text-muted">Coming next — tap to draft a request.</div>
            </button>
            <button
              type="button"
              className="text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              onClick={() => setNote((v) => (v ? v : 'I want to review any warnings/strikes on my account…'))}
            >
              <div className="font-medium text-text">Warnings</div>
              <div className="text-sm text-muted">Coming next — tap to draft a request.</div>
            </button>
            <button
              type="button"
              className="text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
              onClick={() => setNote((v) => (v ? v : 'I want to see my reputation score…'))}
            >
              <div className="font-medium text-text">Reputation score</div>
              <div className="text-sm text-muted">Future — tap to draft a request.</div>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <Textarea
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Tell us what you want to see here..."
            />
            <div className="flex justify-end">
              <a
                className="inline-block"
                href={`mailto:support@flyersup.app?subject=${encodeURIComponent('Ratings & Reviews request')}&body=${encodeURIComponent(note)}`}
              >
                <Button type="button" showArrow={false}>
                  Email support
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

