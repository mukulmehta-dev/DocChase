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
    flat: 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
    low: 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-slate-950/30 text-slate-900 dark:text-slate-100',
    hover: 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-slate-950/30 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 text-slate-900 dark:text-slate-100',
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
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#0E1526] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
