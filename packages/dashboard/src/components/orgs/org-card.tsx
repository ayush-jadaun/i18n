import Link from 'next/link';
import { Org } from '@/lib/api';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export interface OrgCardProps {
  org: Org;
}

/**
 * Card displaying a single organisation with a link to its dashboard.
 */
export function OrgCard({ org }: OrgCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="mb-1">
        <Link
          href={`/orgs/${org.id}`}
          className="text-base font-semibold text-blue-700 hover:underline"
        >
          {org.name}
        </Link>
      </div>
      <CardContent>
        <p className="text-xs text-gray-500 font-mono">{org.slug}</p>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-gray-400">Created {formatDate(org.createdAt)}</span>
        <Link
          href={`/orgs/${org.id}/projects`}
          className="ml-auto text-xs text-blue-600 hover:underline"
        >
          Projects →
        </Link>
      </CardFooter>
    </Card>
  );
}
