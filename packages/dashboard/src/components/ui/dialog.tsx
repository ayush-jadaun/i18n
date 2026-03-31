'use client';

import { HTMLAttributes, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Called when the user requests to close the dialog */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Extra classes for the dialog panel */
  className?: string;
}

/**
 * Accessible modal dialog with backdrop, title, and close button.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={cn(
          'relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6',
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="dialog-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Footer row inside a dialog for action buttons */
export function DialogFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-5 flex items-center justify-end gap-2', className)} {...props}>
      {children}
    </div>
  );
}
