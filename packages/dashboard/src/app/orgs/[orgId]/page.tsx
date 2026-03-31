'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Org } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Organisation dashboard — shows quick links to projects, members, and settings.
 */
export default function OrgDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);

  useEffect(() => {
    api
      .getOrg(orgId)
      .then(setOrg)
      .catch((err) => showToast(err.message, 'error'));
  }, [orgId, showToast]);

  const sections = [
    { href: `/orgs/${orgId}/projects`, label: 'Projects', description: 'Manage translation projects' },
    { href: `/orgs/${orgId}/members`, label: 'Members', description: 'Manage team members and roles' },
    { href: `/orgs/${orgId}/settings`, label: 'Settings', description: 'Organisation settings' },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[{ label: 'Organisations', href: '/orgs' }, { label: org?.name ?? orgId }]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">{org?.name ?? '…'}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <p className="font-semibold text-blue-700 text-sm mb-1">{s.label}</p>
              <CardContent>
                <p className="text-xs text-gray-500">{s.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
