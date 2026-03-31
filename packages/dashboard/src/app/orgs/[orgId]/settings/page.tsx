'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { api, Org } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Organisation settings page — update name and slug.
 */
export default function OrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getOrg(orgId).then((o) => {
      setOrg(o);
      setName(o.name);
      setSlug(o.slug);
    });
  }, [orgId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateOrg(orgId, { name, slug });
      setOrg(updated);
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
          { label: 'Settings' },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">Organisation settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
