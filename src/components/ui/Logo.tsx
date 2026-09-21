import React from 'react';
import { clsx } from 'clsx';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Minimalist Document Icon for DocChase
 * Features an iconic page silhouette with folded top-right corner and clean internal document lines.
 */
export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Page outline */}
    <path
      d="M6 3.5C5.17157 3.5 4.5 4.17157 4.5 5V19C4.5 19.8284 5.17157 20.5 6 20.5H18C18.8284 20.5 19.5 19.8284 19.5 19V8.5L14.5 3.5H6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Geometric folded corner */}
    <path
      d="M14.2 3.8V8.8H19.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Minimalist document checklist/file indicator lines */}
    <path
      d="M8.5 12H15.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8.5 15.5H13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className,
  showText = true,
  textClassName = '',
}) => {
  const tileSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-9 h-9 rounded-xl',
  };

  const iconPixelSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      {/* Monochrome Tile: White glyph on dark in dark mode / black glyph on white/neutral in light */}
      <div
        className={clsx(
          tileSizes[size],
          'flex items-center justify-center shrink-0 transition-all duration-200',
          'bg-black dark:bg-white text-white dark:text-black shadow-sm',
          'border border-neutral-800 dark:border-neutral-200'
        )}
      >
        <LogoIcon size={iconPixelSizes[size]} />
      </div>

      {showText && (
        <span
          className={clsx(
            'font-bold tracking-tight text-neutral-900 dark:text-white',
            textSizes[size],
            textClassName
          )}
        >
          Doc<span className="font-medium text-neutral-500 dark:text-neutral-400">Chase</span>
        </span>
      )}
    </div>
  );
};
