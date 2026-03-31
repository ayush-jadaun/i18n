'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import { api, Org, Project } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

/**
 * Import translations page.
 * Accepts a JSON file upload and posts it to the API for bulk import.
 */
export default function ImportPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [locale, setLocale] = useState('');
  const [fileContent, setFileContent] = useState<Record<string, string> | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.getProject(projectId)]).then(([o, p]) => {
      setOrg(o);
      setProject(p);
      setLocale(p.defaultLocale);
    });
  }, [orgId, projectId]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          setParseError('File must be a flat JSON object: { "key": "value" }');
          return;
        }
        setFileContent(parsed as Record<string, string>);
      } catch {
        setParseError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fileContent) return;
    setImporting(true);
    try {
      const result = await api.importTranslations(projectId, locale, fileContent);
      showToast(`Imported ${result.imported} translations`, 'success');
      setFileContent(null);
      setFileName('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  const localeOptions = (project?.locales ?? []).map((l) => ({ value: l, label: l }));

  return (
    <div className="p-6 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Projects', href: `/orgs/${orgId}/projects` },
          { label: project?.name ?? projectId, href: `/orgs/${orgId}/projects/${projectId}` },
          { label: 'Import' },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">Import translations</h1>

      <Card className="mb-4">
        <p className="text-sm text-gray-600">
          Upload a flat JSON file mapping translation keys to values:
        </p>
        <pre className="mt-2 bg-gray-50 rounded p-3 text-xs text-gray-700 overflow-x-auto">
          {`{\n  "welcome.title": "Welcome",\n  "nav.home": "Home"\n}`}
        </pre>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Target locale"
          options={localeOptions}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JSON file
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
          />
          {fileName && (
            <p className="mt-1 text-xs text-gray-500">Selected: {fileName}</p>
          )}
          {parseError && (
            <p className="mt-1 text-xs text-red-600">{parseError}</p>
          )}
        </div>

        {fileContent && (
          <p className="text-xs text-gray-500">
            {Object.keys(fileContent).length} keys ready to import
          </p>
        )}

        <Button type="submit" loading={importing} disabled={!fileContent}>
          Import
        </Button>
      </form>
    </div>
  );
}
