/**
 * Barrel export for all Zod validation schemas in @i18n-platform/core.
 * @module schemas
 */

export {
  LocaleSchema,
  TranslationKeySchema,
  TranslationStatusSchema,
  DeliveryModeSchema,
  SlugSchema,
} from './locale.schema';

export {
  UpdateTranslationSchema,
  BulkUpdateTranslationsSchema,
  CreateKeysSchema,
  ReviewTranslationSchema,
} from './translation.schema';
export type {
  UpdateTranslation,
  BulkUpdateTranslations,
  CreateKeys,
  ReviewTranslation,
} from './translation.schema';

export {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectConfigSchema,
} from './project.schema';
export type {
  CreateProject,
  UpdateProject,
} from './project.schema';

export {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  InviteMemberSchema,
} from './organization.schema';
export type {
  CreateOrganization,
  UpdateOrganization,
  InviteMember,
} from './organization.schema';

export {
  CreateUserSchema,
  LoginSchema,
  UpdateUserPreferencesSchema,
} from './user.schema';
export type {
  CreateUser,
  Login,
  UpdateUserPreferences,
} from './user.schema';

export { CreateApiKeySchema } from './api-key.schema';
export type { CreateApiKey } from './api-key.schema';

export {
  MachineTranslationConfigSchema,
  TriggerMtSchema,
} from './mt.schema';
export type {
  TriggerMt,
} from './mt.schema';

export {
  FORMAT_IDS,
  ImportFileSchema,
  ExportQuerySchema,
} from './import-export.schema';
export type {
  FormatId,
  ImportFile,
  ExportQuery,
} from './import-export.schema';
