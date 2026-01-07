/**
 * Flyers Up Logo Component
 * Reusable logo with different size variants
 */

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkToHome?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 100, height: 30 },
  md: { width: 140, height: 42 },
  lg: { width: 200, height: 60 },
};

export default function Logo({ 
  size = 'md', 
  linkToHome = true,
  className = '' 
}: LogoProps) {
  const { width, height } = sizeConfig[size];
  
  const logoElement = (
    <Image
      src="/logo.svg"
      alt="Flyers Up"
      width={width}
      height={height}
      className={className}
      priority
    />
  );

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

// Icon-only version (just the signpost)
export function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 40 60" 
      className={`w-8 h-12 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>
          {`.icon-stroke { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }`}
          {`.icon-fill { fill: currentColor; }`}
        </style>
      </defs>
      
      {/* Pole */}
      <rect x="18" y="20" width="4" height="38" className="icon-fill" rx="1"/>
      
      {/* Grass */}
      <path d="M12 56 L17 50 L20 56 M20 56 L23 48 L26 56 M26 56 L30 52 L34 56" className="icon-stroke" strokeWidth="1.5"/>
      
      {/* Arrow up */}
      <path d="M20 4 L20 16 M14 10 L20 4 L26 10" className="icon-stroke" strokeWidth="2.5"/>
      
      {/* Top flyer */}
      <rect x="24" y="8" width="14" height="11" className="icon-stroke" fill="white" rx="1"/>
      <line x1="26" y1="12" x2="36" y2="12" className="icon-stroke" strokeWidth="1"/>
      <line x1="26" y1="15" x2="33" y2="15" className="icon-stroke" strokeWidth="1"/>
      
      {/* Middle flyer */}
      <rect x="26" y="22" width="14" height="11" className="icon-stroke" fill="white" rx="1"/>
      <line x1="28" y1="26" x2="38" y2="26" className="icon-stroke" strokeWidth="1"/>
      <line x1="28" y1="29" x2="35" y2="29" className="icon-stroke" strokeWidth="1"/>
      
      {/* Bottom flyer */}
      <rect x="24" y="36" width="14" height="10" className="icon-stroke" fill="white" rx="1"/>
      <line x1="26" y1="40" x2="36" y2="40" className="icon-stroke" strokeWidth="1"/>
    </svg>
  );
}




