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

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'secondary-dark' | 'outline-dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

    const variantStyles = {
      primary:
        'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border border-neutral-800 dark:border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_20px_rgba(255,255,255,0.18)] hover:bg-neutral-800 dark:hover:bg-neutral-100 hover:border-neutral-700 dark:hover:border-neutral-300 active:bg-neutral-950 dark:active:bg-neutral-200 tactile-rim',
      secondary:
        'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 shadow-sm tactile-rim-white',
      destructive:
        'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-sm',
      ghost:
        'bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100',
      outline:
        'bg-transparent text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700',
      'secondary-dark':
        'bg-black dark:bg-[#121215] text-white border border-white/[0.16] hover:bg-neutral-900 dark:hover:bg-[#18181b] hover:border-white/35 hover:shadow-[0_0_16px_rgba(255,255,255,0.08)] active:bg-neutral-950',
      'outline-dark':
        'bg-transparent text-neutral-200 border border-white/[0.16] hover:bg-white/[0.06] hover:border-white/40 hover:text-white hover:shadow-[0_0_16px_rgba(255,255,255,0.08)] active:bg-white/[0.04]',
    };

    const sizeStyles = {
      sm: 'h-8 px-2.5 text-label-sm gap-1.5',
      md: 'h-10 px-3.5 text-label-md gap-2',
      lg: 'h-11 px-4 text-body-md gap-2.5',
    };

    const iconSizes = {
      sm: 'text-[16px]',
      md: 'text-[18px]',
      lg: 'text-[20px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={customTwMerge(
          clsx(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && 'w-full',
            className
          )
        )}
        {...props}
      >
        {isLoading && (
          <span className={clsx('material-symbols-outlined animate-spin', iconSizes[size])}>
            progress_activity
          </span>
        )}
        {!isLoading && icon && iconPosition === 'left' && (
          <span className={clsx('material-symbols-outlined', iconSizes[size])}>{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && icon && iconPosition === 'right' && (
          <span className={clsx('material-symbols-outlined', iconSizes[size])}>{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
