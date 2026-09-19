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
          <label htmlFor={inputId} className="font-medium text-xs text-slate-700 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 pointer-events-none select-none">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full h-10 rounded-lg font-normal text-sm text-slate-900 bg-white border border-slate-300 placeholder:text-slate-400 outline-none transition-all duration-150',
                'focus:border-primary-container focus:ring-2 focus:ring-primary-container/15',
                leftIcon ? 'pl-9' : 'px-3.5',
                rightElement ? 'pr-10' : 'pr-3.5',
                error && 'border-error focus:border-error focus:ring-error/15',
                props.disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200',
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
          <p className="text-xs text-error mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
