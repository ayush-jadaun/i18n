import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';
import { orgMembers } from './org-members';

describe('Database Schema', () => {
  describe('organizations table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(organizations);
      expect(columns.id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.slug).toBeDefined();
      expect(columns.settings).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('users table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(users);
      expect(columns.id).toBeDefined();
      expect(columns.email).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.passwordHash).toBeDefined();
      expect(columns.avatarUrl).toBeDefined();
      expect(columns.preferences).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });
  });

  describe('orgMembers table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(orgMembers);
      expect(columns.id).toBeDefined();
      expect(columns.orgId).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.role).toBeDefined();
      expect(columns.permissions).toBeDefined();
      expect(columns.joinedAt).toBeDefined();
    });
  });
});
