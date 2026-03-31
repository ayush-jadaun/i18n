'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, Org, Project } from '@/lib/api';
import { ProjectList } from '@/components/projects/project-list';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Project list page for an organisation.
 */
export default function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.listProjects(orgId)])
      .then(([o, p]) => {
        setOrg(o);
        setProjects(p);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [orgId, showToast]);

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, project]);
    showToast(`Project "${project.name}" created`, 'success');
  }

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Projects' },
        ]}
        className="mb-4"
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setDialogOpen(true)}>+ New project</Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <ProjectList projects={projects} orgId={orgId} />
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        orgId={orgId}
        onCreated={handleCreated}
      />
    </div>
  );
}
