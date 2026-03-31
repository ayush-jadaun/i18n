'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, Org, Project, ProjectStats } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { coverage, coverageColor, localeLabel } from '@/lib/utils';

/**
 * Statistics page — shows per-locale translation coverage and status counts.
 */
export default function StatsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.getProject(projectId), api.getProjectStats(projectId)])
      .then(([o, p, s]) => {
        setOrg(o);
        setProject(p);
        setStats(s);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [orgId, projectId, showToast]);

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Projects', href: `/orgs/${orgId}/projects` },
          { label: project?.name ?? projectId, href: `/orgs/${orgId}/projects/${projectId}` },
          { label: 'Statistics' },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Statistics</h1>
      {stats && (
        <p className="text-sm text-gray-500 mb-6">
          Total keys: <strong>{stats.totalKeys}</strong>
        </p>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : stats && project ? (
        <div className="space-y-4">
          {project.locales.map((locale) => {
            const s = stats.locales[locale];
            const pct = s ? coverage(s.translated, stats.totalKeys) : 0;
            return (
              <Card key={locale}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-gray-800">
                      {localeLabel(locale)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">{locale}</span>
                    {locale === project.defaultLocale && (
                      <Badge variant="default" className="ml-2">default</Badge>
                    )}
                  </div>
                  <span className={`text-xl font-bold ${coverageColor(pct)}`}>
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {s && (
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>
                      <span className="font-medium text-green-600">{s.approved}</span> approved
                    </span>
                    <span>
                      <span className="font-medium text-purple-600">{s.translated - s.approved}</span> in review
                    </span>
                    <span>
                      <span className="font-medium text-yellow-600">{s.draft}</span> draft
                    </span>
                    <span>
                      <span className="font-medium text-red-600">{s.outdated}</span> outdated
                    </span>
                    <span>
                      <span className="font-medium text-gray-500">
                        {stats.totalKeys - s.translated}
                      </span>{' '}
                      untranslated
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
