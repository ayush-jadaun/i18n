'use client';

import { useState, useEffect } from 'react';
import { api, Org } from '@/lib/api';
import { OrgList } from '@/components/orgs/org-list';
import { CreateOrgDialog } from '@/components/orgs/create-org-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Organisations list page — shows all orgs for the current user.
 */
export default function OrgsPage() {
  const { showToast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    api
      .listOrgs()
      .then(setOrgs)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  function handleCreated(org: Org) {
    setOrgs((prev) => [...prev, org]);
    showToast(`Organisation "${org.name}" created`, 'success');
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your translation workspaces</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ New organisation</Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <OrgList orgs={orgs} />
      )}

      <CreateOrgDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
