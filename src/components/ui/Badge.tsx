import React from 'react';
import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-display',
        'text-display-mobile',
        'text-headline-lg',
        'text-headline-md',
        'text-headline-sm',
        'text-body-lg',
        'text-body-md',
        'text-body-sm',
        'text-label-md',
        'text-label-sm',
        'text-tabular-numeric',
      ],
    },
  },
});

export type BadgeVariant =
  | 'ready'
  | 'complete'
  | 'waiting'
  | 'pending'
  | 'overdue'
  | 'rejected'
  | 'missing'
  | 'uploaded'
  | 'approved'
  | 'draft'
  | 'active'
  | 'cancelled'
  | 'neutral'
  | (string & {});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  size = 'sm',
  className,
  children,
  ...props
}) => {
  const getVariantStyles = (v: BadgeVariant) => {
    switch (v) {
      case 'ready':
      case 'complete':
      case 'approved':
        return {
          classes: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          defaultIcon: 'check_circle',
        };
      case 'active':
        return {
          classes: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          defaultIcon: 'verified',
        };
      case 'waiting':
      case 'pending':
        return {
          classes: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          defaultIcon: 'hourglass_top',
        };
      case 'uploaded':
        return {
          classes: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700',
          defaultIcon: 'upload_file',
        };
      case 'overdue':
      case 'rejected':
      case 'cancelled':
      case 'missing':
        return {
          classes: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          defaultIcon: v === 'rejected' ? 'cancel' : 'priority_high',
        };
      case 'draft':
        return {
          classes: 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
          defaultIcon: 'edit_note',
        };
      case 'neutral':
      default:
        return {
          classes: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
          defaultIcon: '',
        };
    }
  };

  const { classes, defaultIcon } = getVariantStyles(variant);
  const displayIcon = icon !== undefined ? icon : defaultIcon;

  return (
    <span
      className={customTwMerge(
        clsx(
          'inline-flex items-center font-medium border select-none transition-colors rounded-md',
          size === 'sm' ? 'px-2 py-0.5 text-label-sm gap-1' : 'px-2.5 py-1 text-label-md gap-1.5',
          classes,
          className
        )
      )}
      {...props}
    >
      {displayIcon && (
        <span
          className={clsx(
            'material-symbols-outlined flex-shrink-0',
            size === 'sm' ? 'text-[13px]' : 'text-[15px]'
          )}
        >
          {displayIcon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
