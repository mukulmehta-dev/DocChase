import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightElement, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="font-medium text-xs text-neutral-700 dark:text-neutral-300 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="material-symbols-outlined text-[18px] text-neutral-400 dark:text-neutral-500 absolute left-3 pointer-events-none select-none">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full h-10 rounded-lg font-normal text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#121215] border border-neutral-300 dark:border-neutral-800 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none transition-all duration-150',
                'focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:focus:border-white dark:focus:ring-white/15',
                leftIcon ? 'pl-9' : 'px-3.5',
                rightElement ? 'pr-10' : 'pr-3.5',
                error && 'border-error dark:border-rose-500 focus:border-error dark:focus:border-rose-500 focus:ring-error/15',
                props.disabled && 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-800',
                className
              )
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2 flex items-center">{rightElement}</div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-error dark:text-rose-400 mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
