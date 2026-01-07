/**
 * Rating Stars Component
 * Displays star rating with numeric value
 */

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  showNumber?: boolean;
  showCount?: boolean;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: { star: 'text-sm', number: 'text-sm', count: 'text-xs' },
  md: { star: 'text-base', number: 'text-base', count: 'text-sm' },
  lg: { star: 'text-xl', number: 'text-xl', count: 'text-base' },
};

export default function RatingStars({
  rating,
  maxRating = 5,
  showNumber = true,
  showCount = false,
  reviewCount = 0,
  size = 'md',
  className = '',
}: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);
  
  const styles = sizeStyles[size];

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* Stars */}
      <div className={`flex items-center ${styles.star}`}>
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-amber-400">★</span>
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <span className="text-amber-400 relative">
            <span className="absolute overflow-hidden w-1/2">★</span>
            <span className="text-gray-300">★</span>
          </span>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
      </div>
      
      {/* Numeric rating */}
      {showNumber && (
        <span className={`font-semibold text-gray-900 ${styles.number}`}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {/* Review count */}
      {showCount && reviewCount > 0 && (
        <span className={`text-gray-500 ${styles.count}`}>
          ({reviewCount.toLocaleString()} reviews)
        </span>
      )}
    </div>
  );
}

// Compact version for cards
export function RatingCompact({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-amber-400 text-sm">★</span>
      <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-gray-500 text-sm">({reviewCount})</span>
      )}
    </div>
  );
}




