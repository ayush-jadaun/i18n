import { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Responsive table wrapper with overflow scroll.
 */
export function TableWrapper({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)} {...props}>
      {children}
    </div>
  );
}

/** Full-width HTML table with consistent styling */
export function Table({ className, children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full border-collapse text-sm', className)}
      {...props}
    >
      {children}
    </table>
  );
}

/** Table head row container */
export function Thead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-gray-50 border-b border-gray-200', className)} {...props}>
      {children}
    </thead>
  );
}

/** Table body container */
export function Tbody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-gray-100', className)} {...props}>
      {children}
    </tbody>
  );
}

/** Table row */
export function Tr({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-gray-50 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

/** Table header cell */
export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

/** Table data cell */
export function Td({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3 py-2 text-gray-800 align-top', className)} {...props}>
      {children}
    </td>
  );
}
