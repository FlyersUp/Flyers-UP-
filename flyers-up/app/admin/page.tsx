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

export default function AdminPage() {
  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-2xl mx-auto text-center py-16">
        {/* Icon */}
        <div className="text-6xl mb-6">🔒</div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Admin Panel
        </h1>
        
        {/* Coming soon message */}
        <p className="text-xl text-gray-600 mb-8">
          Coming Soon
        </p>
        
        {/* Description */}
        <div className="bg-gray-100 rounded-lg p-6 text-left">
          <h2 className="font-semibold text-gray-800 mb-3">
            Planned Features:
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              User management (customers & pros)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Service category configuration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Booking oversight & disputes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Platform analytics & reports
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Payment & payout management
            </li>
          </ul>
        </div>
        
        {/* Dev note */}
        <p className="mt-8 text-sm text-gray-400">
          This is a placeholder route. Admin functionality will be added in a future update.
        </p>
      </div>
    </Layout>
  );
}




