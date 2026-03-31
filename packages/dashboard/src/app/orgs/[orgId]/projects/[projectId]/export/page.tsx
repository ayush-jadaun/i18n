'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, Org, Project } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { localeLabel } from '@/lib/utils';

const FORMAT_OPTIONS = [
  { value: 'json', label: 'JSON (flat)' },
  { value: 'yaml', label: 'YAML' },
  { value: 'po', label: 'GNU gettext (.po)' },
  { value: 'xliff', label: 'XLIFF' },
];

/**
 * Export translations page.
 * Generates a download URL for the chosen locale and format.
 */
export default function ExportPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [locale, setLocale] = useState('');
  const [format, setFormat] = useState('json');

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.getProject(projectId)]).then(([o, p]) => {
      setOrg(o);
      setProject(p);
      setLocale(p.defaultLocale);
    });
  }, [orgId, projectId]);

  function handleDownload() {
    const url = api.getExportUrl(projectId, locale, format);
    // Trigger a download by opening the URL (the API sets Content-Disposition)
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.slug ?? projectId}_${locale}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading ${locale} (${format})`, 'info');
  }

  const localeOptions = (project?.locales ?? []).map((l) => ({
    value: l,
    label: `${localeLabel(l)} (${l})`,
  }));

  return (
    <div className="p-6 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Projects', href: `/orgs/${orgId}/projects` },
          { label: project?.name ?? projectId, href: `/orgs/${orgId}/projects/${projectId}` },
          { label: 'Export' },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">Export translations</h1>

      <div className="space-y-4">
        <Select
          label="Locale"
          options={localeOptions}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        />
        <Select
          label="Format"
          options={FORMAT_OPTIONS}
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        />
        <Button onClick={handleDownload} disabled={!locale}>
          Download
        </Button>
      </div>
    </div>
  );
}
