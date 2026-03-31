import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Simple card container with border, background, and padding.
 */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white border border-gray-200 rounded-lg p-4 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Card header section */
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-3 pb-3 border-b border-gray-100', className)} {...props}>
      {children}
    </div>
  );
}

/** Card title text */
export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  );
}

/** Card body / content section */
export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm text-gray-600', className)} {...props}>
      {children}
    </div>
  );
}

/** Card footer section */
export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-3 pt-3 border-t border-gray-100 flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}
