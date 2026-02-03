/**
 * Trust Shield Banner Component
 * Shows trust/verification messaging (non-promissory)
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
        <span className="text-success">🛡️</span>
        <span className="text-muted">Trust &amp; verification details available</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg ${className}`}>
        <div className="flex-shrink-0 w-8 h-8 bg-success/15 rounded-full flex items-center justify-center">
          <span className="text-lg">🛡️</span>
        </div>
        <div>
          <p className="text-sm font-medium text-text">
            Trust indicators
          </p>
          <p className="text-xs text-muted">
            See verification and profile details before booking
          </p>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`p-4 bg-surface2 border border-border rounded-xl ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-success/15 rounded-xl flex items-center justify-center">
          <span className="text-2xl">🛡️</span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-text mb-1">
            Trust &amp; Verification
          </h4>
          <p className="text-sm text-muted leading-relaxed">
            Review profile details and any verification indicators before booking. Verification indicators can help reduce risk, but they are not a guarantee of performance, safety, or quality.
          </p>
        </div>
      </div>
      
      {/* Trust indicators */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
        <TrustIndicator icon="✓" label="Verification visible" />
        <TrustIndicator icon="💬" label="Messaging" />
        <TrustIndicator icon="💬" label="24/7 Support" />
      </div>
    </div>
  );
}

function TrustIndicator({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}




