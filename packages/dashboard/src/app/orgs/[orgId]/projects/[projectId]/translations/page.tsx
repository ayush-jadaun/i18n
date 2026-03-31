'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, Org, Project } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { TranslationEditor } from '@/components/translations/translation-editor';
import { useToast } from '@/components/ui/toast';

/**
 * Translation editor page — the core feature of the dashboard.
 * Renders the full inline-editable translation grid.
 */
export default function TranslationsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.getProject(projectId)])
      .then(([o, p]) => {
        setOrg(o);
        setProject(p);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [orgId, projectId, showToast]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <Breadcrumbs
          items={[
            { label: 'Organisations', href: '/orgs' },
            { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
            { label: 'Projects', href: `/orgs/${orgId}/projects` },
            { label: project?.name ?? projectId, href: `/orgs/${orgId}/projects/${projectId}` },
            { label: 'Translations' },
          ]}
          className="mb-1"
        />
        <h1 className="text-lg font-bold text-gray-900">Translation Editor</h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : project ? (
        <div className="flex-1 overflow-hidden">
          <TranslationEditor project={project} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Project not found
        </div>
      )}
    </div>
  );
}
