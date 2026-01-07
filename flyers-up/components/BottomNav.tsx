'use client';

/**
 * Bottom Navigation Footer
 * Intentionally NOT tied to any mock token/user id.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg safe-area-bottom">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/customer/home"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/customer') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>

          <Link
            href="/notifications"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/notifications') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">🔔</span>
            <span className="text-xs font-medium">Notifications</span>
          </Link>

          <Link
            href="/messages"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/messages') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">💬</span>
            <span className="text-xs font-medium">Messages</span>
          </Link>

          <Link
            href="/settings"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/settings') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">⚙️</span>
            <span className="text-xs font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}



