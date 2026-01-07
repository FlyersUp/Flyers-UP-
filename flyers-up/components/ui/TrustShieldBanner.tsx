/**
 * Trust Shield Banner Component
 * Shows guarantee/protection messaging
 */

interface TrustShieldBannerProps {
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
}

export default function TrustShieldBanner({ 
  variant = 'full',
  className = '' 
}: TrustShieldBannerProps) {
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <span className="text-emerald-600">🛡️</span>
        <span className="text-gray-600">Protected by Flyers Up Guarantee</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg ${className}`}>
        <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-lg">🛡️</span>
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Satisfaction Guaranteed
          </p>
          <p className="text-xs text-emerald-600">
            Covered by Flyers Up protection
          </p>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <span className="text-2xl">🛡️</span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-emerald-900 mb-1">
            Flyers Up Satisfaction Shield
          </h4>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Your booking is protected. If you&apos;re not satisfied, we&apos;ll make it right or refund your payment. 
            All pros are background-checked and insured.
          </p>
        </div>
      </div>
      
      {/* Trust indicators */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-emerald-100">
        <TrustIndicator icon="✓" label="Background Checked" />
        <TrustIndicator icon="🔒" label="Secure Payments" />
        <TrustIndicator icon="💬" label="24/7 Support" />
      </div>
    </div>
  );
}

function TrustIndicator({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-emerald-700">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}




