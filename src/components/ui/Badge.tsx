import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          defaultIcon: 'check_circle',
        };
      case 'active':
        return {
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          defaultIcon: 'verified',
        };
      case 'waiting':
      case 'pending':
        return {
          classes: 'bg-amber-50 text-amber-800 border-amber-200',
          defaultIcon: 'hourglass_top',
        };
      case 'uploaded':
        return {
          classes: 'bg-blue-50 text-blue-800 border-blue-200',
          defaultIcon: 'upload_file',
        };
      case 'overdue':
      case 'rejected':
      case 'cancelled':
      case 'missing':
        return {
          classes: 'bg-rose-50 text-rose-800 border-rose-200',
          defaultIcon: v === 'rejected' ? 'cancel' : 'priority_high',
        };
      case 'draft':
        return {
          classes: 'bg-slate-100 text-slate-600 border-slate-200',
          defaultIcon: 'edit_note',
        };
      case 'neutral':
      default:
        return {
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          defaultIcon: '',
        };
    }
  };

  const { classes, defaultIcon } = getVariantStyles(variant);
  const displayIcon = icon !== undefined ? icon : defaultIcon;

  return (
    <span
      className={twMerge(
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
