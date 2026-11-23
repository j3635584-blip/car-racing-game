import React, { useId } from 'react';

interface GameLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<GameLogoProps['size']>, string> = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
};

export const GameLogo: React.FC<GameLogoProps> = ({
  size = 'md',
  showWordmark = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const shieldGrad = `av-shield-${uid}`;
  const rimGrad = `av-rim-${uid}`;
  const apexGrad = `av-apex-${uid}`;
  const velocityGrad = `av-vel-${uid}`;

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Apex Velocity logo"
        className={`${SIZE_CLASSES[size]} shrink-0`}
      >
        <defs>
          <linearGradient id={shieldGrad} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#161b29" />
            <stop offset="100%" stopColor="#07090f" />
          </linearGradient>
          <linearGradient id={rimGrad} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="52%" stopColor="#334155" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id={apexGrad} x1="32" y1="11" x2="32" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id={velocityGrad} x1="14" y1="31" x2="50" y2="51" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Hexagonal Obsidian Motorsport Crest */}
        <path
          d="M32 4L56 15.5V39.5L32 60L8 39.5V15.5L32 4Z"
          fill={`url(#${shieldGrad})`}
          stroke={`url(#${rimGrad})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Inner Technical Chamfer Frame */}
        <path
          d="M32 8.5L51.5 17.8V37.6L32 55L12.5 37.6V17.8L32 8.5Z"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />

        {/* Twin Cyan Velocity Intake Blades (V) */}
        <path
          d="M15 29.5L23.5 33.2L32 45.2L40.5 33.2L49 29.5L32 51.5L15 29.5Z"
          fill={`url(#${velocityGrad})`}
        />

        {/* Forward-Swept Amber Apex Chevron (A) */}
        <path
          d="M32 12L46.5 34.5H38.6L32 23.6L25.4 34.5H17.5L32 12Z"
          fill={`url(#${apexGrad})`}
        />

        {/* Center Racing Stripe Cutout */}
        <path d="M30.5 29H33.5L32 38.5L30.5 29Z" fill="#f8fafc" />
      </svg>

      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-wide text-white whitespace-nowrap shrink-0">
          Apex Velocity
        </span>
      )}
    </div>
  );
};
