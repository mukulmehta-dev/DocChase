import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={twMerge(
          clsx(
            'relative w-full bg-white dark:bg-[#121215] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 overflow-hidden z-10 flex flex-col',
            maxWidthStyles[maxWidth]
          )
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between">
            <div>
              {title && <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100">{title}</h3>}
              {description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[calc(85vh-120px)] text-neutral-900 dark:text-neutral-100">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-neutral-50 dark:bg-[#18181b] border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
