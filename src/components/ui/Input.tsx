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
          <label htmlFor={inputId} className="font-medium text-xs text-slate-700 dark:text-slate-300 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none select-none">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full h-10 rounded-lg font-normal text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-150',
                'focus:border-primary-container focus:ring-2 focus:ring-primary-container/15 dark:focus:border-sky-500 dark:focus:ring-sky-500/20',
                leftIcon ? 'pl-9' : 'px-3.5',
                rightElement ? 'pr-10' : 'pr-3.5',
                error && 'border-error dark:border-rose-500 focus:border-error dark:focus:border-rose-500 focus:ring-error/15',
                props.disabled && 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-800',
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
