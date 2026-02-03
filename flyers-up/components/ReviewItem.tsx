/**
 * Review Item Component
 * Displays a single user review
 */

import Image from 'next/image';
import RatingStars from './ui/RatingStars';

interface ReviewItemProps {
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  helpful?: number;
  className?: string;
}

export default function ReviewItem({
  userName,
  userAvatar,
  rating,
  comment,
  date,
  helpful = 0,
  className = '',
}: ReviewItemProps) {
  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`p-4 border border-border rounded-xl bg-surface ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-surface2 flex-shrink-0 flex items-center justify-center">
          {userAvatar && userAvatar.trim() !== '' ? (
            <Image
              src={userAvatar}
              alt={userName || 'User avatar'}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </div>
        
        {/* Name and rating */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-text truncate">{userName}</h4>
            <span className="text-sm text-muted/70 flex-shrink-0">{formattedDate}</span>
          </div>
          <RatingStars rating={rating} size="sm" showNumber={false} />
        </div>
      </div>
      
      {/* Comment */}
      <p className="text-text text-sm leading-relaxed">{comment}</p>
      
      {/* Helpful count */}
      {helpful > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button className="text-sm text-muted/70 hover:text-text transition-colors">
            👍 Helpful ({helpful})
          </button>
        </div>
      )}
    </div>
  );
}




