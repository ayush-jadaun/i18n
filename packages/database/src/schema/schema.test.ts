import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';
import { orgMembers } from './org-members';
import { projects } from './projects';
import { projectLocales } from './project-locales';
import { namespaces } from './namespaces';
import { translationKeys } from './translation-keys';
import { translations } from './translations';
import { translationHistory } from './translation-history';

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

  describe('projects table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(projects);
      expect(columns.id).toBeDefined();
      expect(columns.orgId).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.slug).toBeDefined();
      expect(columns.defaultLocale).toBeDefined();
      expect(columns.deliveryMode).toBeDefined();
      expect(columns.settings).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('projectLocales table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(projectLocales);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.locale).toBeDefined();
      expect(columns.enabled).toBeDefined();
      expect(columns.coveragePercent).toBeDefined();
      expect(columns.lastSyncedAt).toBeDefined();
    });
  });

  describe('namespaces table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(namespaces);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.sortOrder).toBeDefined();
    });
  });

  describe('translationKeys table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translationKeys);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.namespaceId).toBeDefined();
      expect(columns.key).toBeDefined();
      expect(columns.defaultValue).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.maxLength).toBeDefined();
      expect(columns.metadata).toBeDefined();
      expect(columns.isArchived).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('translations table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translations);
      expect(columns.id).toBeDefined();
      expect(columns.keyId).toBeDefined();
      expect(columns.locale).toBeDefined();
      expect(columns.value).toBeDefined();
      expect(columns.status).toBeDefined();
      expect(columns.translatedBy).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('translationHistory table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translationHistory);
      expect(columns.id).toBeDefined();
      expect(columns.translationId).toBeDefined();
      expect(columns.oldValue).toBeDefined();
      expect(columns.newValue).toBeDefined();
      expect(columns.oldStatus).toBeDefined();
      expect(columns.newStatus).toBeDefined();
      expect(columns.changedBy).toBeDefined();
      expect(columns.changeSource).toBeDefined();
      expect(columns.changedAt).toBeDefined();
    });
  });
});
