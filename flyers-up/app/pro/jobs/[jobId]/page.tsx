'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { use } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Active Job Screen - Screen 17
 * Job details with action buttons
 */
export default function ActiveJob({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Job Details
        </h1>

        <Card withRail className="mb-6">
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">ADDRESS</Label>
              <p className="text-gray-700">123 Main St, Apt 4B</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Label className="mb-2 block">TIME</Label>
              <p className="text-gray-700">Jan 15, 2024 at 10:00 AM</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Label className="mb-2 block">SERVICES</Label>
              <p className="text-gray-700">Deep Clean</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Label className="mb-2 block">CUSTOMER NOTES</Label>
              <p className="text-gray-700">
                Please focus on the kitchen and bathrooms. Extra attention to the oven.
              </p>
            </div>

            <div className="border-t-2 border-[#FFD3A1] pt-4 bg-[#FFD3A1]/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <Label>TOTAL</Label>
                <div className="text-2xl font-bold text-gray-900">$150</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button className="w-full" onClick={() => router.push(`/pro/jobs/${jobId}/timeline`)}>
            START JOB →
          </Button>
          <Button variant="secondary" className="w-full">
            MARK AS COMPLETE →
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}












