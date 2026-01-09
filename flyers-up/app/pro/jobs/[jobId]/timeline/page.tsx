'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Timeline } from '@/components/ui/Timeline';
import { Card } from '@/components/ui/Card';
import { use } from 'react';

/**
 * Job Status Timeline - Screen 16
 * Vertical timeline of job events
 */
export default function JobTimeline({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  const steps = [
    { id: '1', label: 'BOOKED', status: 'completed' as const },
    { id: '2', label: 'ACCEPTED', status: 'completed' as const },
    { id: '3', label: 'ON THE WAY', status: 'completed' as const },
    { id: '4', label: 'IN PROGRESS', status: 'current' as const },
    { id: '5', label: 'COMPLETED', status: 'upcoming' as const },
  ];

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Job Timeline
        </h1>

        <Card withRail>
          <Label className="mb-6 block">JOB STATUS</Label>
          <Timeline steps={steps} />
        </Card>
      </div>
    </AppLayout>
  );
}












