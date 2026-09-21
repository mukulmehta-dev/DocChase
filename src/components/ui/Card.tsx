import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'low' | 'hover';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  elevation = 'low',
  header,
  footer,
  padding = 'md',
  children,
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  const elevationStyles = {
    flat: 'bg-white dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100',
    low: 'bg-white dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-black/40 text-neutral-900 dark:text-neutral-100',
    hover: 'bg-white dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-black/40 hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-150 text-neutral-900 dark:text-neutral-100',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl relative overflow-hidden',
          elevationStyles[elevation],
          className
        )
      )}
      {...props}
    >
      {header && (
        <div className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className="px-4 py-3 bg-neutral-50 dark:bg-[#18181b] border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
