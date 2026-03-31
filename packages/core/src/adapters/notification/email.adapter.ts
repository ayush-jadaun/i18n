/**
 * Email notification adapter.
 *
 * Delivers notifications via an injected email-sending function.  No direct
 * SMTP dependency is introduced; the caller supplies the transport function,
 * keeping this adapter infrastructure-agnostic.
 *
 * @module adapters/notification/email
 */

import type { INotificationAdapter, Notification } from '../../interfaces/notification-adapter';

/**
 * Dependencies injected into {@link EmailNotificationAdapter}.
 */
export interface EmailAdapterDeps {
  /**
   * Function responsible for sending an email.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param body - Plain-text (or HTML) email body
   */
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

/**
 * Notification adapter that delivers messages via email.
 *
 * The `recipient` field on the {@link Notification} is used as the `to`
 * address, `title` maps to the email subject, and `body` maps to the message
 * body.  Any `metadata` on the notification is ignored.
 *
 * @example
 * ```ts
 * const emailAdapter = new EmailNotificationAdapter({
 *   sendEmail: async (to, subject, body) => {
 *     await nodemailerTransport.sendMail({ to, subject, text: body });
 *   },
 * });
 *
 * await emailAdapter.send({
 *   title: 'Review needed',
 *   body: 'Please review 3 pending translations.',
 *   recipient: 'translator@example.com',
 * });
 * ```
 */
export class EmailNotificationAdapter implements INotificationAdapter {
  /** @inheritdoc */
  readonly channelId = 'email';

  private readonly deps: EmailAdapterDeps;

  /**
   * Creates a new {@link EmailNotificationAdapter}.
   *
   * @param deps - Injected dependencies containing the email-sending function
   */
  constructor(deps: EmailAdapterDeps) {
    this.deps = deps;
  }

  /**
   * Sends an email notification.
   *
   * Maps the notification fields as follows:
   * - `notification.recipient` → email `to` address
   * - `notification.title` → email subject
   * - `notification.body` → email body
   *
   * @param notification - The notification to deliver
   * @throws {Error} If the underlying `sendEmail` function rejects
   */
  async send(notification: Notification): Promise<void> {
    await this.deps.sendEmail(
      notification.recipient,
      notification.title,
      notification.body,
    );
  }
}
