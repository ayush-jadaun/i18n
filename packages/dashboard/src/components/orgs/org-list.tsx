'use client';

import { Org } from '@/lib/api';
import { OrgCard } from './org-card';

export interface OrgListProps {
  orgs: Org[];
}

/**
 * Grid of organisation cards.
 */
export function OrgList({ orgs }: OrgListProps) {
  if (orgs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-sm">No organisations yet.</p>
        <p className="text-xs mt-1">Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {orgs.map((org) => (
        <OrgCard key={org.id} org={org} />
      ))}
    </div>
  );
}
