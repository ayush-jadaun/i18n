/**
 * Slack notification adapter.
 *
 * Delivers notifications to Slack via an injected HTTP request function,
 * posting to an incoming-webhook URL.  No direct HTTP library dependency is
 * introduced; the caller supplies the transport function.
 *
 * @module adapters/notification/slack
 */

import type { INotificationAdapter, Notification } from '../../interfaces/notification-adapter';

/**
 * Dependencies injected into {@link SlackNotificationAdapter}.
 */
export interface SlackAdapterDeps {
  /**
   * Function that sends an HTTP POST request.
   *
   * @param url - The target URL (Slack incoming-webhook endpoint)
   * @param body - The request body to POST (will be serialized to JSON by the caller)
   */
  sendRequest(url: string, body: unknown): Promise<void>;
}

/**
 * Notification adapter that delivers messages to Slack via incoming webhooks.
 *
 * The `recipient` field on the {@link Notification} is treated as the
 * Slack incoming-webhook URL.  The message is formatted as Markdown-compatible
 * text with the title bolded and separated from the body by a blank line.
 *
 * @example
 * ```ts
 * const slackAdapter = new SlackNotificationAdapter({
 *   sendRequest: async (url, body) => {
 *     await fetch(url, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(body),
 *     });
 *   },
 * });
 *
 * await slackAdapter.send({
 *   title: 'Deploy complete',
 *   body: 'Version 2.0.0 is live.',
 *   recipient: 'https://hooks.slack.com/services/T00/B00/xxx',
 * });
 * ```
 */
export class SlackNotificationAdapter implements INotificationAdapter {
  /** @inheritdoc */
  readonly channelId = 'slack';

  private readonly deps: SlackAdapterDeps;

  /**
   * Creates a new {@link SlackNotificationAdapter}.
   *
   * @param deps - Injected dependencies containing the HTTP request function
   */
  constructor(deps: SlackAdapterDeps) {
    this.deps = deps;
  }

  /**
   * Sends a Slack notification via the incoming-webhook URL.
   *
   * The posted payload has a single `text` property formatted as:
   * ```
   * **title**
   *
   * body
   * ```
   *
   * @param notification - The notification to deliver.
   *   `notification.recipient` must be a valid Slack incoming-webhook URL.
   * @throws {Error} If the underlying `sendRequest` function rejects
   */
  async send(notification: Notification): Promise<void> {
    const text = `**${notification.title}**\n\n${notification.body}`;
    await this.deps.sendRequest(notification.recipient, { text });
  }
}
