import Link from 'next/link';
import { Project } from '@/lib/api';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export interface ProjectCardProps {
  project: Project;
  orgId: string;
}

/**
 * Card displaying a project with its locale badges and quick-access links.
 */
export function ProjectCard({ project, orgId }: ProjectCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="mb-2">
        <Link
          href={`/orgs/${orgId}/projects/${project.id}`}
          className="text-base font-semibold text-blue-700 hover:underline"
        >
          {project.name}
        </Link>
      </div>
      <CardContent>
        <p className="text-xs text-gray-500 font-mono mb-2">{project.slug}</p>
        <div className="flex flex-wrap gap-1">
          {project.locales.map((locale) => (
            <Badge
              key={locale}
              variant={locale === project.defaultLocale ? 'default' : 'neutral'}
            >
              {locale}
              {locale === project.defaultLocale && ' ★'}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-gray-400">Created {formatDate(project.createdAt)}</span>
        <Link
          href={`/orgs/${orgId}/projects/${project.id}/translations`}
          className="ml-auto text-xs text-blue-600 hover:underline"
        >
          Editor →
        </Link>
      </CardFooter>
    </Card>
  );
}
