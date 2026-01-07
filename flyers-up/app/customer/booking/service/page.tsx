'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockServicePros } from '@/lib/mockData';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';

/**
 * Booking - Select Service - Screen 5
 * Radio-like list of service options
 */
function BookingServiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proId = searchParams.get('proId');
  const pro = mockServicePros.find(p => p.id === proId);
  const [selectedService, setSelectedService] = useState<string>('');

  const services = [
    { id: '1', name: 'Standard Clean', price: 75, duration: '2 hours' },
    { id: '2', name: 'Deep Clean', price: 150, duration: '4 hours' },
    { id: '3', name: 'Move-Out Clean', price: 200, duration: '6 hours' },
  ];

  const selected = services.find(s => s.id === selectedService);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Select Service
        </h1>

        <div className="space-y-4 mb-8">
          {services.map((service) => (
            <Card
              key={service.id}
              withRail
              onClick={() => setSelectedService(service.id)}
              className={selectedService === service.id ? 'border-[#A8E6CF] border-2' : ''}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.duration}</p>
                </div>
                <div className="text-xl font-bold text-gray-900">${service.price}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary pill */}
        {selected && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">{pro?.name}</div>
                <div className="font-semibold text-gray-900">
                  {selected.name} • ${selected.price}
                </div>
              </div>
              <Button
                onClick={() => router.push(`/customer/booking/schedule?proId=${proId}&serviceId=${selectedService}`)}
                disabled={!selectedService}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function BookingService() {
  return (
    <Suspense fallback={
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <BookingServiceContent />
    </Suspense>
  );
}

