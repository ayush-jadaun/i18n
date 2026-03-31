'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Project, Org, ProjectStats } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { coverage, coverageColor, localeLabel } from '@/lib/utils';

/**
 * Project dashboard — overview with locale coverage and quick-access links.
 */
export default function ProjectDashboardPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.getProject(projectId), api.getProjectStats(projectId)])
      .then(([o, p, s]) => {
        setOrg(o);
        setProject(p);
        setStats(s);
      })
      .catch((err) => showToast(err.message, 'error'));
  }, [orgId, projectId, showToast]);

  const links = [
    { href: `/orgs/${orgId}/projects/${projectId}/translations`, label: 'Translation editor' },
    { href: `/orgs/${orgId}/projects/${projectId}/import`, label: 'Import' },
    { href: `/orgs/${orgId}/projects/${projectId}/export`, label: 'Export' },
    { href: `/orgs/${orgId}/projects/${projectId}/stats`, label: 'Statistics' },
    { href: `/orgs/${orgId}/projects/${projectId}/settings`, label: 'Settings' },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Projects', href: `/orgs/${orgId}/projects` },
          { label: project?.name ?? projectId },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">{project?.name ?? '…'}</h1>

      {/* Locale coverage */}
      {stats && project && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Locale coverage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {project.locales.map((locale) => {
              const locStat = stats.locales[locale];
              const pct = locStat ? coverage(locStat.translated, stats.totalKeys) : 0;
              return (
                <Card key={locale} className="text-center py-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {localeLabel(locale)}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{locale}</p>
                  <p className={`text-2xl font-bold ${coverageColor(pct)}`}>{pct}%</p>
                  {locale === project.defaultLocale && (
                    <Badge variant="default" className="mt-1">default</Badge>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick access</h2>
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 bg-white border border-gray-200 rounded text-sm text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
