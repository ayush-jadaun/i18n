/**
 * Tests for WebhookNotificationAdapter.
 *
 * @module adapters/notification/webhook.adapter.test
 */

import { describe, it, expect, vi } from 'vitest';
import { WebhookNotificationAdapter } from './webhook.adapter';
import type { Notification } from '../../interfaces/notification-adapter';

describe('WebhookNotificationAdapter', () => {
  const makeAdapter = () => {
    const sendRequest = vi.fn().mockResolvedValue(undefined);
    const adapter = new WebhookNotificationAdapter({ sendRequest });
    return { adapter, sendRequest };
  };

  // ---------------------------------------------------------------------------
  // channelId
  // ---------------------------------------------------------------------------

  it('should expose channelId "webhook"', () => {
    const { adapter } = makeAdapter();
    expect(adapter.channelId).toBe('webhook');
  });

  // ---------------------------------------------------------------------------
  // send
  // ---------------------------------------------------------------------------

  describe('send', () => {
    it('should POST the full notification object as JSON to the recipient URL', async () => {
      const { adapter, sendRequest } = makeAdapter();
      const notification: Notification = {
        title: 'Deploy complete',
        body: 'Version 1.2.3 deployed.',
        recipient: 'https://example.com/hooks/notify',
      };

      await adapter.send(notification);

      expect(sendRequest).toHaveBeenCalledOnce();
      expect(sendRequest).toHaveBeenCalledWith(
        'https://example.com/hooks/notify',
        notification,
        { 'Content-Type': 'application/json' },
      );
    });

    it('should include metadata in the posted body when present', async () => {
      const { adapter, sendRequest } = makeAdapter();
      const notification: Notification = {
        title: 'Alert',
        body: 'See details.',
        recipient: 'https://example.com/webhook',
        metadata: { severity: 'critical', projectId: 'proj-1' },
      };

      await adapter.send(notification);

      const [, body] = sendRequest.mock.calls[0] as [string, Notification, Record<string, string>];
      expect(body).toEqual(notification);
      expect(body.metadata).toEqual({ severity: 'critical', projectId: 'proj-1' });
    });

    it('should return void (undefined) on success', async () => {
      const { adapter } = makeAdapter();
      const result = await adapter.send({
        title: 'T',
        body: 'B',
        recipient: 'https://example.com/hook',
      });
      expect(result).toBeUndefined();
    });

    it('should propagate errors thrown by sendRequest', async () => {
      const sendRequest = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const adapter = new WebhookNotificationAdapter({ sendRequest });
      await expect(
        adapter.send({ title: 'T', body: 'B', recipient: 'https://broken.example.com/hook' }),
      ).rejects.toThrow('Connection refused');
    });

    it('should always send Content-Type application/json header', async () => {
      const { adapter, sendRequest } = makeAdapter();
      await adapter.send({
        title: 'Test',
        body: 'Body',
        recipient: 'https://api.example.com/webhook',
      });
      const [, , headers] = sendRequest.mock.calls[0] as [string, unknown, Record<string, string>];
      expect(headers).toMatchObject({ 'Content-Type': 'application/json' });
    });
  });
});
