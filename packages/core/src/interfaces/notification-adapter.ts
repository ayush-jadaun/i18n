/**
 * Notification adapter interface for sending alerts and messages.
 *
 * Implement this interface to integrate a notification channel
 * (e.g., email, Slack, SMS, webhook).
 *
 * @module interfaces/notification-adapter
 */

/**
 * A notification message to be dispatched through a channel.
 */
export interface Notification {
  /** Short, human-readable subject line or heading */
  title: string;
  /** Full notification body text (may contain Markdown depending on the channel) */
  body: string;
  /**
   * Recipient identifier interpreted by the channel implementation.
   * - Email channel: an email address (`"alice@example.com"`)
   * - Slack channel: a Slack user ID or channel name (`"#translations"`)
   * - Webhook channel: a target URL
   */
  recipient: string;
  /**
   * Arbitrary channel-specific metadata (e.g., template IDs, category tags,
   * priority flags). The shape is defined by the concrete adapter.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Adapter for a notification delivery channel.
 *
 * @example
 * ```ts
 * class EmailAdapter implements INotificationAdapter {
 *   readonly channelId = 'email';
 *
 *   async send(notification: Notification): Promise<void> {
 *     await this.mailer.send({
 *       to: notification.recipient,
 *       subject: notification.title,
 *       text: notification.body,
 *     });
 *   }
 * }
 * ```
 */
export interface INotificationAdapter {
  /**
   * Unique identifier for this notification channel.
   * @example "email", "slack", "sms", "webhook"
   */
  readonly channelId: string;

  /**
   * Sends a notification through this channel.
   *
   * @param notification - The notification to send
   * @throws {Error} If delivery fails
   */
  send(notification: Notification): Promise<void>;
}
