import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'folder_open',
  title,
  description,
  actionLabel,
  actionIcon = 'add',
  onAction,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40">
      <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-3 shadow-inner">
        <span className="material-symbols-outlined text-[26px]">{icon}</span>
      </div>
      <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" icon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
