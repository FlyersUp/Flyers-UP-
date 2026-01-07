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
    <div className={`relative overflow-hidden rounded-xl border border-gray-200 ${className}`}>
      {/* Mock map background */}
      <div 
        className="h-48 sm:h-64 bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50"
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
            stroke="#14b8a6"
            strokeWidth="0.5"
            strokeDasharray="2,1"
            className="animate-pulse"
          />
          {/* Start point */}
          <circle cx="10" cy="80" r="2" fill="#14b8a6" />
          {/* End point */}
          <circle cx="90" cy="20" r="2.5" fill="#0d9488" />
        </svg>

        {/* Location pin */}
        <div className="absolute top-1/4 right-1/4 transform -translate-x-1/2">
          <div className="relative">
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">📍</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-teal-600 rotate-45" />
          </div>
        </div>

        {/* Current location indicator */}
        <div className="absolute bottom-1/4 left-1/4">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md animate-pulse" />
        </div>
      </div>

      {/* Address bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-t border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400 flex-shrink-0">📍</span>
            <span className="text-sm text-gray-700 truncate">{address}</span>
          </div>
          <button 
            className="flex-shrink-0 p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="Copy address"
          >
            📋
          </button>
        </div>
      </div>

      {/* View in maps link */}
      <button className="absolute top-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-700 hover:bg-white shadow-sm transition-colors">
        Open in Maps ↗
      </button>
    </div>
  );
}




