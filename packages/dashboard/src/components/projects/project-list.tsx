'use client';

import { Project } from '@/lib/api';
import { ProjectCard } from './project-card';

export interface ProjectListProps {
  projects: Project[];
  orgId: string;
}

/**
 * Grid of project cards for an organisation.
 */
export function ProjectList({ projects, orgId }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-sm">No projects yet.</p>
        <p className="text-xs mt-1">Create a project to start managing translations.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} orgId={orgId} />
      ))}
    </div>
  );
}
