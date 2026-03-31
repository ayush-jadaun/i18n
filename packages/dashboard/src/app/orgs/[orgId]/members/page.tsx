'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { api, Member, Org } from '@/lib/api';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

const roleVariant: Record<Member['role'], 'success' | 'info' | 'warning' | 'neutral' | 'default'> = {
  owner: 'warning',
  admin: 'info',
  editor: 'default',
  viewer: 'neutral',
};

/**
 * Member management page — list, invite, and remove organisation members.
 */
export default function MembersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Member['role']>('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    Promise.all([api.getOrg(orgId), api.listMembers(orgId)]).then(([o, m]) => {
      setOrg(o);
      setMembers(m);
    });
  }, [orgId]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const member = await api.inviteMember(orgId, { email: inviteEmail, role: inviteRole });
      setMembers((prev) => [...prev, member]);
      setInviteEmail('');
      showToast(`Invited ${inviteEmail}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invite failed', 'error');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await api.removeMember(orgId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast('Member removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Remove failed', 'error');
    }
  }

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[
          { label: 'Organisations', href: '/orgs' },
          { label: org?.name ?? orgId, href: `/orgs/${orgId}` },
          { label: 'Members' },
        ]}
        className="mb-4"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-6">Members</h1>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Email address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            placeholder="colleague@example.com"
          />
        </div>
        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as Member['role'])}
          className="w-36"
        />
        <Button type="submit" loading={inviting}>
          Invite
        </Button>
      </form>

      {/* Members table */}
      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Joined</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {members.map((m) => (
            <Tr key={m.id}>
              <Td>{m.name}</Td>
              <Td>{m.email}</Td>
              <Td>
                <Badge variant={roleVariant[m.role]}>{m.role}</Badge>
              </Td>
              <Td>{formatDate(m.joinedAt)}</Td>
              <Td>
                {m.role !== 'owner' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemove(m.id)}
                  >
                    Remove
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
          {members.length === 0 && (
            <Tr>
              <Td colSpan={5} className="text-center text-gray-400">
                No members
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
