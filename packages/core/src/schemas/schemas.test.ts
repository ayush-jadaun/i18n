/**
 * Tests for all Zod validation schemas in @i18n-platform/core.
 * @module schemas/schemas.test
 */

import { describe, it, expect } from 'vitest';
import {
  LocaleSchema,
  TranslationKeySchema,
  TranslationStatusSchema,
  DeliveryModeSchema,
  SlugSchema,
} from './locale.schema';
import {
  UpdateTranslationSchema,
  BulkUpdateTranslationsSchema,
  CreateKeysSchema,
  ReviewTranslationSchema,
} from './translation.schema';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectConfigSchema,
} from './project.schema';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  InviteMemberSchema,
} from './organization.schema';
import {
  CreateUserSchema,
  LoginSchema,
  UpdateUserPreferencesSchema,
} from './user.schema';
import {
  CreateApiKeySchema,
} from './api-key.schema';
import {
  MachineTranslationConfigSchema,
  TriggerMtSchema,
} from './mt.schema';
import {
  FORMAT_IDS,
  ImportFileSchema,
  ExportQuerySchema,
} from './import-export.schema';

// ---------------------------------------------------------------------------
// locale.schema
// ---------------------------------------------------------------------------

describe('LocaleSchema', () => {
  it('accepts a valid BCP-47 locale (language only)', () => {
    expect(() => LocaleSchema.parse('en')).not.toThrow();
    expect(LocaleSchema.parse('fr')).toBe('fr');
  });

  it('accepts a valid BCP-47 locale (language-region)', () => {
    expect(() => LocaleSchema.parse('en-US')).not.toThrow();
    expect(LocaleSchema.parse('pt-BR')).toBe('pt-BR');
  });

  it('accepts a valid BCP-47 locale (language-script-region)', () => {
    expect(() => LocaleSchema.parse('zh-Hans-CN')).not.toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => LocaleSchema.parse('')).toThrow();
  });

  it('rejects an invalid locale format', () => {
    expect(() => LocaleSchema.parse('not-a-locale-123')).toThrow();
    expect(() => LocaleSchema.parse('EN')).toThrow();
    expect(() => LocaleSchema.parse('en_US')).toThrow();
  });

  it('rejects a non-string value', () => {
    expect(() => LocaleSchema.parse(42)).toThrow();
    expect(() => LocaleSchema.parse(null)).toThrow();
  });
});

describe('TranslationKeySchema', () => {
  it('accepts a valid dot-separated key', () => {
    expect(() => TranslationKeySchema.parse('auth.login.title')).not.toThrow();
    expect(TranslationKeySchema.parse('common.buttons.submit')).toBe('common.buttons.submit');
  });

  it('accepts a simple single-segment key', () => {
    expect(() => TranslationKeySchema.parse('greeting')).not.toThrow();
  });

  it('accepts keys with underscores and hyphens', () => {
    expect(() => TranslationKeySchema.parse('auth.login_title')).not.toThrow();
    expect(() => TranslationKeySchema.parse('nav.back-button')).not.toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => TranslationKeySchema.parse('')).toThrow();
  });

  it('rejects keys with spaces', () => {
    expect(() => TranslationKeySchema.parse('auth.login title')).toThrow();
  });

  it('rejects keys with leading/trailing dots', () => {
    expect(() => TranslationKeySchema.parse('.auth.login')).toThrow();
    expect(() => TranslationKeySchema.parse('auth.login.')).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => TranslationKeySchema.parse(null)).toThrow();
  });
});

describe('TranslationStatusSchema', () => {
  it('accepts all 6 valid statuses', () => {
    const statuses = [
      'untranslated', 'machine_translated', 'needs_review',
      'reviewed', 'approved', 'published',
    ];
    for (const s of statuses) {
      expect(() => TranslationStatusSchema.parse(s)).not.toThrow();
    }
  });

  it('rejects an unknown status', () => {
    expect(() => TranslationStatusSchema.parse('pending')).toThrow();
    expect(() => TranslationStatusSchema.parse('')).toThrow();
  });
});

describe('DeliveryModeSchema', () => {
  it('accepts valid delivery modes', () => {
    expect(() => DeliveryModeSchema.parse('api')).not.toThrow();
    expect(() => DeliveryModeSchema.parse('cdn')).not.toThrow();
    expect(() => DeliveryModeSchema.parse('bundled')).not.toThrow();
  });

  it('rejects unknown delivery modes', () => {
    expect(() => DeliveryModeSchema.parse('push')).toThrow();
  });
});

describe('SlugSchema', () => {
  it('accepts valid slugs', () => {
    expect(() => SlugSchema.parse('my-project')).not.toThrow();
    expect(() => SlugSchema.parse('project123')).not.toThrow();
    expect(() => SlugSchema.parse('a')).not.toThrow();
  });

  it('rejects slugs with uppercase letters', () => {
    expect(() => SlugSchema.parse('My-Project')).toThrow();
  });

  it('rejects slugs with spaces', () => {
    expect(() => SlugSchema.parse('my project')).toThrow();
  });

  it('rejects slugs with leading/trailing hyphens', () => {
    expect(() => SlugSchema.parse('-my-project')).toThrow();
    expect(() => SlugSchema.parse('my-project-')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => SlugSchema.parse('')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// translation.schema
// ---------------------------------------------------------------------------

describe('UpdateTranslationSchema', () => {
  it('accepts a valid update with value only', () => {
    expect(() => UpdateTranslationSchema.parse({ value: 'Hello world' })).not.toThrow();
  });

  it('accepts a valid update with value and status', () => {
    expect(() =>
      UpdateTranslationSchema.parse({ value: 'Hello', status: 'approved' })
    ).not.toThrow();
  });

  it('rejects missing value', () => {
    expect(() => UpdateTranslationSchema.parse({ status: 'approved' })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateTranslationSchema.parse({ value: 'Hello', status: 'invalid' })
    ).toThrow();
  });
});

describe('BulkUpdateTranslationsSchema', () => {
  it('accepts a valid bulk update', () => {
    expect(() =>
      BulkUpdateTranslationsSchema.parse({
        translations: [
          {
            keyId: '550e8400-e29b-41d4-a716-446655440000',
            locale: 'fr',
            value: 'Bonjour',
          },
        ],
      })
    ).not.toThrow();
  });

  it('rejects an empty translations array', () => {
    expect(() => BulkUpdateTranslationsSchema.parse({ translations: [] })).toThrow();
  });

  it('rejects a non-UUID keyId', () => {
    expect(() =>
      BulkUpdateTranslationsSchema.parse({
        translations: [{ keyId: 'not-a-uuid', locale: 'fr', value: 'Bonjour' }],
      })
    ).toThrow();
  });
});

describe('CreateKeysSchema', () => {
  it('accepts a valid keys payload', () => {
    expect(() =>
      CreateKeysSchema.parse({
        keys: [
          { key: 'auth.login', defaultValue: 'Login', namespace: 'auth' },
        ],
      })
    ).not.toThrow();
  });

  it('rejects an empty keys array', () => {
    expect(() => CreateKeysSchema.parse({ keys: [] })).toThrow();
  });

  it('rejects missing key field', () => {
    expect(() =>
      CreateKeysSchema.parse({ keys: [{ defaultValue: 'Login' }] })
    ).toThrow();
  });
});

describe('ReviewTranslationSchema', () => {
  it('accepts approved action', () => {
    expect(() =>
      ReviewTranslationSchema.parse({ action: 'approved' })
    ).not.toThrow();
  });

  it('accepts rejected action with comment', () => {
    expect(() =>
      ReviewTranslationSchema.parse({ action: 'rejected', comment: 'Wrong tone' })
    ).not.toThrow();
  });

  it('rejects invalid action', () => {
    expect(() =>
      ReviewTranslationSchema.parse({ action: 'pending' })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// project.schema
// ---------------------------------------------------------------------------

describe('CreateProjectSchema', () => {
  const validProject = {
    name: 'My App',
    slug: 'my-app',
    defaultLocale: 'en',
    supportedLocales: ['en', 'fr'],
    delivery: 'api',
  };

  it('accepts a valid project payload', () => {
    expect(() => CreateProjectSchema.parse(validProject)).not.toThrow();
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validProject;
    expect(() => CreateProjectSchema.parse(rest)).toThrow();
  });

  it('rejects missing defaultLocale', () => {
    const { defaultLocale: _, ...rest } = validProject;
    expect(() => CreateProjectSchema.parse(rest)).toThrow();
  });

  it('rejects missing supportedLocales', () => {
    const { supportedLocales: _, ...rest } = validProject;
    expect(() => CreateProjectSchema.parse(rest)).toThrow();
  });

  it('rejects empty supportedLocales array', () => {
    expect(() =>
      CreateProjectSchema.parse({ ...validProject, supportedLocales: [] })
    ).toThrow();
  });

  it('rejects an invalid delivery mode', () => {
    expect(() =>
      CreateProjectSchema.parse({ ...validProject, delivery: 'ftp' })
    ).toThrow();
  });

  it('accepts optional settings', () => {
    expect(() =>
      CreateProjectSchema.parse({
        ...validProject,
        settings: { autoTranslateOnPush: true, requireReview: false, minCoverageForPublish: 90 },
      })
    ).not.toThrow();
  });
});

describe('UpdateProjectSchema', () => {
  it('accepts an empty update (all fields optional)', () => {
    expect(() => UpdateProjectSchema.parse({})).not.toThrow();
  });

  it('accepts a partial update', () => {
    expect(() => UpdateProjectSchema.parse({ name: 'New Name' })).not.toThrow();
  });
});

describe('ProjectConfigSchema', () => {
  const validConfig = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    apiUrl: 'https://api.example.com',
    apiKey: 'my-api-key',
    defaultLocale: 'en',
    supportedLocales: ['en', 'fr'],
    namespaces: ['common', 'auth'],
    delivery: { mode: 'api' },
    source: { include: ['src/**/*.ts'] },
    output: { path: './locales', filePattern: '{{locale}}/{{namespace}}.json' },
    validation: {
      checkMissingPlaceholders: true,
      checkExtraPlaceholders: false,
      checkLength: true,
    },
  };

  it('accepts a valid project config', () => {
    expect(() => ProjectConfigSchema.parse(validConfig)).not.toThrow();
  });

  it('rejects an invalid projectId (not UUID)', () => {
    expect(() =>
      ProjectConfigSchema.parse({ ...validConfig, projectId: 'not-a-uuid' })
    ).toThrow();
  });

  it('rejects an invalid apiUrl (not URL)', () => {
    expect(() =>
      ProjectConfigSchema.parse({ ...validConfig, apiUrl: 'not-a-url' })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// organization.schema
// ---------------------------------------------------------------------------

describe('CreateOrganizationSchema', () => {
  it('accepts a valid organization payload', () => {
    expect(() =>
      CreateOrganizationSchema.parse({ name: 'Acme Inc', slug: 'acme-inc' })
    ).not.toThrow();
  });

  it('rejects missing name', () => {
    expect(() => CreateOrganizationSchema.parse({ slug: 'acme' })).toThrow();
  });

  it('rejects a slug with spaces', () => {
    expect(() =>
      CreateOrganizationSchema.parse({ name: 'Acme', slug: 'acme inc' })
    ).toThrow();
  });

  it('rejects missing slug', () => {
    expect(() => CreateOrganizationSchema.parse({ name: 'Acme' })).toThrow();
  });
});

describe('UpdateOrganizationSchema', () => {
  it('accepts an empty update', () => {
    expect(() => UpdateOrganizationSchema.parse({})).not.toThrow();
  });

  it('accepts name-only update', () => {
    expect(() =>
      UpdateOrganizationSchema.parse({ name: 'New Name' })
    ).not.toThrow();
  });

  it('accepts settings update', () => {
    expect(() =>
      UpdateOrganizationSchema.parse({ settings: { defaultMtProvider: 'deepl' } })
    ).not.toThrow();
  });
});

describe('InviteMemberSchema', () => {
  it('accepts a valid invite', () => {
    expect(() =>
      InviteMemberSchema.parse({ email: 'user@example.com', role: 'translator' })
    ).not.toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() =>
      InviteMemberSchema.parse({ email: 'not-an-email', role: 'admin' })
    ).toThrow();
  });

  it('rejects an invalid role', () => {
    expect(() =>
      InviteMemberSchema.parse({ email: 'user@example.com', role: 'superadmin' })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// user.schema
// ---------------------------------------------------------------------------

describe('CreateUserSchema', () => {
  it('accepts a valid user payload', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'user@example.com',
        name: 'Alice',
        password: 'securepassword',
      })
    ).not.toThrow();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'user@example.com',
        name: 'Alice',
        password: 'short',
      })
    ).toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'not-valid',
        name: 'Alice',
        password: 'securepassword',
      })
    ).toThrow();
  });
});

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() =>
      LoginSchema.parse({ email: 'user@example.com', password: 'mypassword' })
    ).not.toThrow();
  });

  it('rejects missing password', () => {
    expect(() => LoginSchema.parse({ email: 'user@example.com' })).toThrow();
  });
});

describe('UpdateUserPreferencesSchema', () => {
  it('accepts an empty update', () => {
    expect(() => UpdateUserPreferencesSchema.parse({})).not.toThrow();
  });

  it('accepts a theme update', () => {
    expect(() =>
      UpdateUserPreferencesSchema.parse({ theme: 'dark' })
    ).not.toThrow();
  });

  it('rejects an invalid theme', () => {
    expect(() =>
      UpdateUserPreferencesSchema.parse({ theme: 'neon' })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// api-key.schema
// ---------------------------------------------------------------------------

describe('CreateApiKeySchema', () => {
  const validApiKey = {
    name: 'CI Key',
    environment: 'production',
    scopes: {
      translations: 'read',
      keys: 'read',
      importExport: 'none',
      mt: 'none',
      publish: 'none',
    },
  };

  it('accepts a valid API key payload', () => {
    expect(() => CreateApiKeySchema.parse(validApiKey)).not.toThrow();
  });

  it('rejects an invalid environment', () => {
    expect(() =>
      CreateApiKeySchema.parse({ ...validApiKey, environment: 'local' })
    ).toThrow();
  });

  it('rejects an invalid scope value', () => {
    expect(() =>
      CreateApiKeySchema.parse({
        ...validApiKey,
        scopes: { ...validApiKey.scopes, translations: 'admin' },
      })
    ).toThrow();
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validApiKey;
    expect(() => CreateApiKeySchema.parse(rest)).toThrow();
  });

  it('accepts optional expiresAt (ISO date string)', () => {
    expect(() =>
      CreateApiKeySchema.parse({
        ...validApiKey,
        expiresAt: '2025-12-31T00:00:00.000Z',
      })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// mt.schema
// ---------------------------------------------------------------------------

describe('MachineTranslationConfigSchema', () => {
  const validConfig = {
    enabled: true,
    routing: {
      strategy: 'single',
      rules: [],
      defaultProviderId: 'deepl',
    },
    autoApprove: {
      enabled: false,
      minQualityScore: 0.85,
    },
    costLimits: {
      maxCostPerJob: 5,
      maxMonthlyCost: 100,
    },
  };

  it('accepts a valid MT config', () => {
    expect(() => MachineTranslationConfigSchema.parse(validConfig)).not.toThrow();
  });

  it('rejects qualityThreshold > 1', () => {
    expect(() =>
      MachineTranslationConfigSchema.parse({
        ...validConfig,
        autoApprove: { enabled: true, minQualityScore: 1.5 },
      })
    ).toThrow();
  });

  it('rejects qualityThreshold < 0', () => {
    expect(() =>
      MachineTranslationConfigSchema.parse({
        ...validConfig,
        autoApprove: { enabled: true, minQualityScore: -0.1 },
      })
    ).toThrow();
  });

  it('rejects an invalid routing strategy', () => {
    expect(() =>
      MachineTranslationConfigSchema.parse({
        ...validConfig,
        routing: { ...validConfig.routing, strategy: 'random' },
      })
    ).toThrow();
  });
});

describe('TriggerMtSchema', () => {
  it('accepts a locale-only trigger', () => {
    expect(() => TriggerMtSchema.parse({ locale: 'fr' })).not.toThrow();
  });

  it('accepts locale with optional provider and keyIds', () => {
    expect(() =>
      TriggerMtSchema.parse({
        locale: 'de',
        provider: 'google',
        keyIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
      })
    ).not.toThrow();
  });

  it('rejects missing locale', () => {
    expect(() => TriggerMtSchema.parse({ provider: 'deepl' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// import-export.schema
// ---------------------------------------------------------------------------

describe('FORMAT_IDS', () => {
  it('is a non-empty array of strings', () => {
    expect(Array.isArray(FORMAT_IDS)).toBe(true);
    expect(FORMAT_IDS.length).toBeGreaterThan(0);
    expect(typeof FORMAT_IDS[0]).toBe('string');
  });

  it('includes common formats', () => {
    expect(FORMAT_IDS).toContain('json');
    expect(FORMAT_IDS).toContain('csv');
  });
});

describe('ImportFileSchema', () => {
  const validImport = {
    locale: 'fr',
    format: 'json',
    content: '{"key": "value"}',
    conflictStrategy: 'overwrite',
  };

  it('accepts a valid import payload', () => {
    expect(() => ImportFileSchema.parse(validImport)).not.toThrow();
  });

  it('accepts optional namespace', () => {
    expect(() =>
      ImportFileSchema.parse({ ...validImport, namespace: 'common' })
    ).not.toThrow();
  });

  it('rejects an invalid format', () => {
    expect(() =>
      ImportFileSchema.parse({ ...validImport, format: 'docx' })
    ).toThrow();
  });

  it('rejects an invalid conflict strategy', () => {
    expect(() =>
      ImportFileSchema.parse({ ...validImport, conflictStrategy: 'replace-all' })
    ).toThrow();
  });

  it('rejects missing content', () => {
    const { content: _, ...rest } = validImport;
    expect(() => ImportFileSchema.parse(rest)).toThrow();
  });
});

describe('ExportQuerySchema', () => {
  it('accepts a valid export query', () => {
    expect(() =>
      ExportQuerySchema.parse({ format: 'json' })
    ).not.toThrow();
  });

  it('accepts all optional fields', () => {
    expect(() =>
      ExportQuerySchema.parse({
        locale: 'fr',
        format: 'csv',
        namespace: 'auth',
        statusFilter: ['approved', 'published'],
      })
    ).not.toThrow();
  });

  it('rejects an invalid status in statusFilter', () => {
    expect(() =>
      ExportQuerySchema.parse({ format: 'json', statusFilter: ['approved', 'invalid'] })
    ).toThrow();
  });

  it('rejects missing format', () => {
    expect(() => ExportQuerySchema.parse({})).toThrow();
  });
});
