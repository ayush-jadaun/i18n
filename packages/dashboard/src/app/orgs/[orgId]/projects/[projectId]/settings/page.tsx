'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { api, Org, Project } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Project settings page — update name, slug, and locale list.
 */
export default function ProjectSettingsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [localeInput, setLocaleInput] = useState('');
  const [defaultLocale, setDefaultLocale] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.getProject(projectId)]).then(([o, p]) => {
      setOrg(o);
      setProject(p);
      setName(p.name);
      setLocaleInput(p.locales.join(', '));
      setDefaultLocale(p.defaultLocale);
    });
  }, [orgId, projectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const locales = localeInput.split(',').map((l) => l.trim()).filter(Boolean);
    try {
      const updated = await api.updateProject(projectId, { name, locales, defaultLocale });
      setProject(updated);
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Projects', href: `/orgs/${orgId}/projects` },
          { label: project?.name ?? projectId, href: `/orgs/${orgId}/projects/${projectId}` },
          { label: 'Settings' },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">Project settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Locales (comma-separated)"
          value={localeInput}
          onChange={(e) => setLocaleInput(e.target.value)}
          placeholder="en, fr, de"
        />
        <Input
          label="Default locale"
          value={defaultLocale}
          onChange={(e) => setDefaultLocale(e.target.value)}
          placeholder="en"
        />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
