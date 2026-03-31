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
import { translationReviews } from './translation-reviews';
import { keyContexts } from './key-contexts';
import { apiKeys } from './api-keys';
import { mtConfigs } from './mt-configs';
import { mtQualityScores } from './mt-quality-scores';
import { auditLog } from './audit-log';

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

  describe('translationReviews table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translationReviews);
      expect(columns.id).toBeDefined();
      expect(columns.translationId).toBeDefined();
      expect(columns.reviewerId).toBeDefined();
      expect(columns.action).toBeDefined();
      expect(columns.comment).toBeDefined();
      expect(columns.reviewedAt).toBeDefined();
    });
  });

  describe('keyContexts table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(keyContexts);
      expect(columns.id).toBeDefined();
      expect(columns.keyId).toBeDefined();
      expect(columns.type).toBeDefined();
      expect(columns.value).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });
  });

  describe('apiKeys table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(apiKeys);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.keyHash).toBeDefined();
      expect(columns.keyPrefix).toBeDefined();
      expect(columns.scopes).toBeDefined();
      expect(columns.environment).toBeDefined();
      expect(columns.expiresAt).toBeDefined();
      expect(columns.lastUsedAt).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });
  });

  describe('mtConfigs table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(mtConfigs);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.sourceLocale).toBeDefined();
      expect(columns.targetLocale).toBeDefined();
      expect(columns.provider).toBeDefined();
      expect(columns.enabled).toBeDefined();
      expect(columns.autoTranslate).toBeDefined();
      expect(columns.autoApproveThreshold).toBeDefined();
      expect(columns.providerConfig).toBeDefined();
      expect(columns.costBudgetMonthly).toBeDefined();
      expect(columns.costSpentMonthly).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });
  });

  describe('mtQualityScores table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(mtQualityScores);
      expect(columns.id).toBeDefined();
      expect(columns.mtConfigId).toBeDefined();
      expect(columns.provider).toBeDefined();
      expect(columns.localePair).toBeDefined();
      expect(columns.qualityScore).toBeDefined();
      expect(columns.totalTranslations).toBeDefined();
      expect(columns.acceptedWithoutEdit).toBeDefined();
      expect(columns.acceptedWithEdit).toBeDefined();
      expect(columns.rejected).toBeDefined();
      expect(columns.windowStart).toBeDefined();
      expect(columns.windowEnd).toBeDefined();
    });
  });

  describe('auditLog table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(auditLog);
      expect(columns.id).toBeDefined();
      expect(columns.orgId).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.action).toBeDefined();
      expect(columns.resourceType).toBeDefined();
      expect(columns.resourceId).toBeDefined();
      expect(columns.oldValue).toBeDefined();
      expect(columns.newValue).toBeDefined();
      expect(columns.ipAddress).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });
  });
});
