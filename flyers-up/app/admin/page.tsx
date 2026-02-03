/**
 * Admin Panel - Placeholder
 * 
 * TODO: Implement admin functionality:
 * - User management
 * - Service category management
 * - Booking oversight
 * - Analytics dashboard
 * - Dispute resolution
 * 
 * TODO: Add admin role protection
 */

import Layout from '@/components/Layout';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-2xl mx-auto text-center py-16">
        {/* Icon */}
        <div className="text-6xl mb-6">🔒</div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-text mb-4">
          Admin Panel
        </h1>
        
        {/* Coming soon message */}
        <p className="text-xl text-muted mb-8">
          Coming Soon
        </p>
        
        {/* Description */}
        <div className="bg-surface2 rounded-lg p-6 text-left">
          <h2 className="font-semibold text-text mb-3">
            Planned Features:
          </h2>
          <ul className="space-y-2 text-muted">
            <li className="flex items-center gap-2">
              <span className="text-info">•</span>
              User management (customers & pros)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-info">•</span>
              Service category configuration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-info">•</span>
              Booking oversight & disputes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-info">•</span>
              Platform analytics & reports
            </li>
            <li className="flex items-center gap-2">
              <span className="text-info">•</span>
              Payment & payout management
            </li>
          </ul>
        </div>
        
        {/* Dev note */}
        <p className="mt-8 text-sm text-muted/60">
          This is a placeholder route. Admin functionality will be added in a future update.
        </p>

        <div className="mt-6">
          <Link
            href="/admin/errors"
            className="inline-flex items-center justify-center rounded-lg bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface transition-colors"
          >
            View error logs →
          </Link>
        </div>
      </div>
    </Layout>
  );
}




