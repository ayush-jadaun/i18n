'use client';

import { useState, FormEvent } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, Org } from '@/lib/api';

export interface CreateOrgDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful creation */
  onCreated: (org: Org) => void;
}

/**
 * Modal dialog for creating a new organisation.
 */
export function CreateOrgDialog({ open, onClose, onCreated }: CreateOrgDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(value));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const org = await api.createOrg({ name, slug: slug || undefined });
      onCreated(org);
      setName('');
      setSlug('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="New Organisation">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          label="Organisation name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="Acme Corp"
        />
        <Input
          label="Slug (URL-safe identifier)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="acme-corp"
        />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function autoSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
