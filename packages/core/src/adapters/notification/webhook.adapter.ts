/**
 * Generic webhook notification adapter.
 *
 * Delivers notifications to an arbitrary HTTP endpoint by POSTing the full
 * notification object as JSON.  No direct HTTP library dependency is
 * introduced; the caller supplies the transport function.
 *
 * @module adapters/notification/webhook
 */

import type { INotificationAdapter, Notification } from '../../interfaces/notification-adapter';

/**
 * Dependencies injected into {@link WebhookNotificationAdapter}.
 */
export interface WebhookAdapterDeps {
  /**
   * Function that sends an HTTP POST request.
   *
   * @param url - The target URL (notification recipient)
   * @param body - The request body to POST
   * @param headers - Optional HTTP headers to include in the request
   */
  sendRequest(
    url: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<void>;
}

/**
 * Notification adapter that delivers messages to an arbitrary HTTP webhook.
 *
 * The `recipient` field on the {@link Notification} is treated as the
 * target webhook URL.  The complete notification object (including any
 * `metadata`) is serialised to JSON and POSTed with a `Content-Type:
 * application/json` header.
 *
 * @example
 * ```ts
 * const webhookAdapter = new WebhookNotificationAdapter({
 *   sendRequest: async (url, body, headers) => {
 *     await fetch(url, {
 *       method: 'POST',
 *       headers,
 *       body: JSON.stringify(body),
 *     });
 *   },
 * });
 *
 * await webhookAdapter.send({
 *   title: 'Translation exported',
 *   body: 'Export job #42 completed successfully.',
 *   recipient: 'https://api.example.com/hooks/i18n',
 *   metadata: { jobId: 42, format: 'json-flat' },
 * });
 * ```
 */
export class WebhookNotificationAdapter implements INotificationAdapter {
  /** @inheritdoc */
  readonly channelId = 'webhook';

  private readonly deps: WebhookAdapterDeps;

  /**
   * Creates a new {@link WebhookNotificationAdapter}.
   *
   * @param deps - Injected dependencies containing the HTTP request function
   */
  constructor(deps: WebhookAdapterDeps) {
    this.deps = deps;
  }

  /**
   * Sends a webhook notification by POSTing the notification as JSON.
   *
   * The entire {@link Notification} object is used as the request body,
   * including `title`, `body`, `recipient`, and any `metadata`.
   *
   * @param notification - The notification to deliver.
   *   `notification.recipient` must be a valid HTTPS URL.
   * @throws {Error} If the underlying `sendRequest` function rejects
   */
  async send(notification: Notification): Promise<void> {
    await this.deps.sendRequest(
      notification.recipient,
      notification,
      { 'Content-Type': 'application/json' },
    );
  }
}
