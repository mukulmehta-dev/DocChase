import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
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
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] focus:outline-none';

    const variantStyles = {
      primary:
        'bg-sky-500 text-white border border-sky-400 shadow-[0_1px_2px_rgba(14,165,233,0.25)] hover:bg-sky-400 hover:border-sky-300 active:bg-sky-600 tactile-rim',
      secondary:
        'bg-white text-on-surface border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm tactile-rim-white',
      destructive:
        'bg-white text-error border border-error-container hover:bg-error-container/20 shadow-sm',
      ghost:
        'bg-transparent text-on-surface-variant hover:bg-slate-100 hover:text-on-surface',
      outline:
        'bg-transparent text-sky-600 border border-sky-400 hover:bg-sky-50 active:bg-sky-100',
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
