'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

/**
 * My Business - Screen 14
 * Business settings form
 */
export default function MyBusiness() {
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    serviceAreas: '',
    categories: '',
    startingPrice: '',
  });

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text mb-2">
            My Business
          </h1>
          <Label>MY BUSINESS</Label>
        </div>

        <Card withRail>
          <div className="space-y-6">
            <Input
              label="Business Name"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Description
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border-2 border-accent border-t-2 focus:outline-none focus:ring-2 focus:ring-offset-0"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your business in 1–2 sentences…"
              />
            </div>
            <Input
              label="Service Areas"
              value={formData.serviceAreas}
              onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
            />
            <Input
              label="Categories"
              value={formData.categories}
              onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
            />
            <Input
              label="Starting Price ($)"
              type="number"
              value={formData.startingPrice}
              onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
            />
          </div>
        </Card>

        <div className="mt-6">
          <Button className="w-full">SAVE CHANGES →</Button>
        </div>
      </div>
    </AppLayout>
  );
}












