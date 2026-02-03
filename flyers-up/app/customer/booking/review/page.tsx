'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockServicePros } from '@/lib/mockData';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { getProById, getActiveAddonsForPro, type ServiceAddon, type ServicePro } from '@/lib/api';
import { getCurrentUser, listUserAddresses, type UserAddress } from '@/lib/api';
import { formatMoney, centsToDollars } from '@/lib/utils/money';

/**
 * Booking - Review Details - Screen 7
 * Booking summary with add-ons selection
 */
function BookingReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proId = searchParams.get('proId');
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const [address, setAddress] = useState(''); // Autofilled from saved addresses (or user edit)
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(''); // '' => custom
  
  type ProForReview = ServicePro | (typeof mockServicePros)[number];
  const [pro, setPro] = useState<ProForReview | null>(null);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const basePriceCents = pro?.startingPrice ? Math.round(pro.startingPrice * 100) : 12000; // Default $120

  useEffect(() => {
    const loadData = async () => {
      if (!proId) return;

      try {
        // Load saved addresses (best-effort)
        const user = await getCurrentUser();
        if (user) {
          const list = await listUserAddresses(user.id);
          setAddresses(list);
          const def = list.find((a) => a.isDefault) || list[0];
          if (def && !address) {
            const formatted = [def.line1, def.line2, [def.city, def.state, def.postalCode].filter(Boolean).join(', ')]
              .filter((x) => x && String(x).trim() !== '')
              .join(def.line2 ? '\n' : ', ');
            setAddress(formatted);
            setSelectedAddressId(def.id);
          }
        }

        // Load pro data
        const proData = await getProById(proId);
        if (proData) {
          setPro(proData);
          // Load active add-ons for this pro and category
          const addonsList = await getActiveAddonsForPro(proId, proData.categorySlug);
          setAddons(addonsList);
        } else {
          // Fallback to mock data
          const mockPro = mockServicePros.find(p => p.id === proId);
          if (mockPro) setPro(mockPro);
        }
      } catch (err) {
        console.error('Error loading pro/add-ons:', err);
        // Fallback to mock data
        const mockPro = mockServicePros.find(p => p.id === proId);
        if (mockPro) setPro(mockPro);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [proId, address]);

  const toggleAddon = (addonId: string) => {
    const newSelected = new Set(selectedAddonIds);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddonIds(newSelected);
  };

  // Calculate total
  const selectedAddonsTotal = Array.from(selectedAddonIds).reduce((sum, id) => {
    const addon = addons.find(a => a.id === id);
    return sum + (addon?.priceCents || 0);
  }, 0);
  const totalCents = basePriceCents + selectedAddonsTotal;
  const totalDollars = centsToDollars(totalCents).toFixed(2);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Review Booking
        </h1>

        <Card withRail className="mb-6">
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">LOCATION</Label>
              <div className="space-y-3">
                {addresses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Saved addresses</label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSelectedAddressId(nextId);
                        const selected = addresses.find((a) => a.id === nextId);
                        if (selected) {
                          const formatted = [
                            selected.line1,
                            selected.line2,
                            [selected.city, selected.state, selected.postalCode].filter(Boolean).join(', '),
                          ]
                            .filter((x) => x && String(x).trim() !== '')
                            .join(selected.line2 ? '\n' : ', ');
                          setAddress(formatted);
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {(a.label || 'address').toUpperCase()} — {a.line1}
                        </option>
                      ))}
                      <option value="">Custom…</option>
                    </select>
                  </div>
                )}

                <Input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setSelectedAddressId(''); // custom
                  }}
                  placeholder="Enter service address"
                />
                <p className="text-xs text-muted/70">
                  Tip: save addresses in <Link className="underline" href="/customer/settings/addresses">Settings → Addresses</Link>.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">DATE</Label>
              <p className="text-text">{date || 'Jan 15, 2024'}</p>
              <button className="text-sm text-accent mt-1">Edit</button>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">TIME</Label>
              <p className="text-text">{time || '10:00 AM'}</p>
              <button className="text-sm text-accent mt-1">Edit</button>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">PRO</Label>
              <p className="text-text">{pro?.name}</p>
              <button className="text-sm text-accent mt-1">Edit</button>
            </div>

            {/* Add-Ons Selection */}
            {addons.length > 0 && (
              <div className="border-t border-border pt-4">
                <Label className="mb-3 block">OPTIONAL ADD-ONS</Label>
                <div className="space-y-2">
                  {addons.map((addon) => (
                    <label
                      key={addon.id}
                      className="flex items-center gap-3 p-3 border-2 border-border rounded-lg cursor-pointer hover:border-accent transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddonIds.has(addon.id)}
                        onChange={() => toggleAddon(addon.id)}
                        className="w-4 h-4 text-accent ring-accent"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-text">{addon.title}</div>
                      </div>
                      <div className="font-semibold text-text">
                        {formatMoney(addon.priceCents)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t-2 border-accent pt-4 bg-accent/5 rounded-lg p-4">
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Base Service</span>
                  <span className="text-text">{formatMoney(basePriceCents)}</span>
                </div>
                {selectedAddonIds.size > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Add-ons</span>
                    <span className="text-text">{formatMoney(selectedAddonsTotal)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Label>TOTAL</Label>
                <div className="text-2xl font-bold text-text">${totalDollars}</div>
              </div>
            </div>
          </div>
        </Card>

        <Button
          className="w-full"
          onClick={() => {
            if (!address || address.trim() === '') {
              alert('Please enter a service address');
              return;
            }
            const addonIdsParam = Array.from(selectedAddonIds).join(',');
            router.push(
              `/customer/booking/payment?proId=${proId}&serviceId=${serviceId}&date=${date}&time=${time}&total=${totalDollars}&addonIds=${addonIdsParam}&address=${encodeURIComponent(address)}`
            );
          }}
        >
          CONFIRM BOOKING →
        </Button>
      </div>
    </AppLayout>
  );
}

export default function BookingReview() {
  return (
    <Suspense fallback={
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted/70">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <BookingReviewContent />
    </Suspense>
  );
}

