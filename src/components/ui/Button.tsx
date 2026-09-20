import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B14]';

    const variantStyles = {
      primary:
        'bg-sky-500 text-white border border-sky-400 shadow-[0_1px_2px_rgba(14,165,233,0.25)] hover:bg-sky-400 hover:border-sky-300 hover:shadow-[0_0_20px_rgba(14,165,233,0.30)] active:bg-sky-600 tactile-rim',
      secondary:
        'bg-white dark:bg-slate-800 text-on-surface dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm tactile-rim-white',
      destructive:
        'bg-white dark:bg-slate-800 text-error dark:text-rose-400 border border-error-container dark:border-rose-900/50 hover:bg-error-container/20 dark:hover:bg-rose-950/40 shadow-sm',
      ghost:
        'bg-transparent text-on-surface-variant dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-slate-100',
      outline:
        'bg-transparent text-sky-600 dark:text-sky-400 border border-sky-400 dark:border-sky-500/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:bg-sky-100 dark:active:bg-sky-900/50',
      'secondary-dark':
        'bg-white/[0.05] text-slate-200 border border-white/[0.12] hover:bg-slate-800/80 hover:border-sky-500/50 hover:text-white hover:shadow-[0_0_16px_rgba(14,165,233,0.18)] active:bg-white/[0.08]',
      'outline-dark':
        'bg-transparent text-slate-300 border border-white/[0.12] hover:bg-slate-800/70 hover:border-sky-400/60 hover:text-white hover:shadow-[0_0_16px_rgba(14,165,233,0.18)] active:bg-white/[0.05]',
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
        className={twMerge(
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
