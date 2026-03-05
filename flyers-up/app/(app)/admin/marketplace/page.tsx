/**
 * Admin Marketplace Dashboard
 * Tracks & controls: Surge Pricing, Demand Heatmap, Instant Job Claim
 */
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { MarketplaceDashboard } from './MarketplaceDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminMarketplacePage() {
  await requireAdminUser('/admin/marketplace');

  return (
    <Layout title="Flyers Up – Marketplace Admin">
      <MarketplaceDashboard />
    </Layout>
  );
}
