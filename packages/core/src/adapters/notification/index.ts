/**
 * Notification adapters for the i18n platform.
 *
 * Available implementations:
 * - {@link EmailNotificationAdapter} — email delivery via injected sendEmail function
 * - {@link SlackNotificationAdapter} — Slack incoming-webhook delivery via injected HTTP function
 * - {@link WebhookNotificationAdapter} — generic HTTP webhook delivery via injected HTTP function
 *
 * All implement {@link INotificationAdapter} from `../../interfaces/notification-adapter`.
 *
 * @module adapters/notification
 */

export { EmailNotificationAdapter } from './email.adapter';
export type { EmailAdapterDeps } from './email.adapter';

export { SlackNotificationAdapter } from './slack.adapter';
export type { SlackAdapterDeps } from './slack.adapter';

export { WebhookNotificationAdapter } from './webhook.adapter';
export type { WebhookAdapterDeps } from './webhook.adapter';
