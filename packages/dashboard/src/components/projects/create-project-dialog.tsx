'use client';

import { useState, FormEvent } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, Project } from '@/lib/api';

export interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  /** Called after successful creation */
  onCreated: (project: Project) => void;
}

const COMMON_LOCALES = ['en', 'fr', 'de', 'es', 'pt', 'ja', 'zh-CN', 'ko', 'ar', 'ru'];

/**
 * Modal dialog for creating a new project inside an organisation.
 */
export function CreateProjectDialog({ open, onClose, orgId, onCreated }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [defaultLocale, setDefaultLocale] = useState('en');
  const [localeInput, setLocaleInput] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(value));
    }
  }

  // Parse comma-separated locale list
  const locales = localeInput
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (locales.length === 0) {
      setError('At least one locale is required');
      return;
    }
    setLoading(true);
    try {
      const project = await api.createProject(orgId, {
        name,
        slug: slug || undefined,
        locales,
        defaultLocale,
      });
      onCreated(project);
      setName('');
      setSlug('');
      setLocaleInput('en');
      setDefaultLocale('en');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="New Project" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Project name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="My App"
        />

        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-app"
        />

        <div>
          <Input
            label="Locales (comma-separated)"
            value={localeInput}
            onChange={(e) => setLocaleInput(e.target.value)}
            placeholder="en, fr, de"
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {COMMON_LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  const current = new Set(locales);
                  if (current.has(l)) {
                    current.delete(l);
                  } else {
                    current.add(l);
                  }
                  setLocaleInput(Array.from(current).join(', '));
                }}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  locales.includes(l)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Default locale"
          value={defaultLocale}
          onChange={(e) => setDefaultLocale(e.target.value)}
          placeholder="en"
        />

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create project
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function autoSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
