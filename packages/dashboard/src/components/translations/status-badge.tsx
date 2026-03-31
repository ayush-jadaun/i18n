import { Translation } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

type Status = Translation['status'];

const statusConfig: Record<
  Status,
  { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }
> = {
  approved: { label: 'Approved', variant: 'success' },
  review: { label: 'Review', variant: 'info' },
  draft: { label: 'Draft', variant: 'warning' },
  outdated: { label: 'Outdated', variant: 'danger' },
};

export interface StatusBadgeProps {
  status: Status;
}

/**
 * Coloured badge indicating the status of a single translation value.
 *
 * - approved → green
 * - review   → purple
 * - draft    → yellow
 * - outdated → red
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = statusConfig[status] ?? { label: status, variant: 'neutral' };
  return <Badge variant={variant}>{label}</Badge>;
}
