/**
 * Map Placeholder Component
 * Mock map display for job details
 */

interface MapPlaceholderProps {
  address: string;
  className?: string;
}

export default function MapPlaceholder({ address, className = '' }: MapPlaceholderProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border ${className}`}>
      {/* Mock map background */}
      <div 
        className="h-48 sm:h-64 bg-gradient-to-br from-surface2 via-surface to-bg"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      >
        {/* Fake route line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M 10 80 Q 30 60, 50 50 T 90 20"
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="0.5"
            strokeDasharray="2,1"
            className="animate-pulse"
          />
          {/* Start point */}
          <circle cx="10" cy="80" r="2" fill="hsl(var(--accent))" />
          {/* End point */}
          <circle cx="90" cy="20" r="2.5" fill="hsl(var(--accent))" />
        </svg>

        {/* Location pin */}
        <div className="absolute top-1/4 right-1/4 transform -translate-x-1/2">
          <div className="relative">
            <div className="w-8 h-8 bg-surface border border-accent rounded-full flex items-center justify-center shadow-lg">
              <span className="text-sm">📍</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border border-accent rotate-45" />
          </div>
        </div>

        {/* Current location indicator */}
        <div className="absolute bottom-1/4 left-1/4">
          <div className="w-4 h-4 bg-surface2 rounded-full border-2 border-accent shadow-md animate-pulse" />
        </div>
      </div>

      {/* Address bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted/70 flex-shrink-0">📍</span>
            <span className="text-sm text-text truncate">{address}</span>
          </div>
          <button 
            className="flex-shrink-0 p-2 text-muted hover:text-text hover:bg-surface2 rounded-lg transition-colors"
            title="Copy address"
          >
            📋
          </button>
        </div>
      </div>

      {/* View in maps link */}
      <button className="absolute top-3 right-3 px-3 py-1.5 bg-surface/90 backdrop-blur-sm rounded-lg text-sm font-medium text-text hover:bg-surface2 shadow-sm transition-colors">
        Open in Maps ↗
      </button>
    </div>
  );
}




