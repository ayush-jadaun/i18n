/**
 * Tests for SlackNotificationAdapter.
 *
 * @module adapters/notification/slack.adapter.test
 */

import { describe, it, expect, vi } from 'vitest';
import { SlackNotificationAdapter } from './slack.adapter';
import type { Notification } from '../../interfaces/notification-adapter';

describe('SlackNotificationAdapter', () => {
  const makeAdapter = () => {
    const sendRequest = vi.fn().mockResolvedValue(undefined);
    const adapter = new SlackNotificationAdapter({ sendRequest });
    return { adapter, sendRequest };
  };

  // ---------------------------------------------------------------------------
  // channelId
  // ---------------------------------------------------------------------------

  it('should expose channelId "slack"', () => {
    const { adapter } = makeAdapter();
    expect(adapter.channelId).toBe('slack');
  });

  // ---------------------------------------------------------------------------
  // send
  // ---------------------------------------------------------------------------

  describe('send', () => {
    it('should POST to the recipient URL with a formatted text payload', async () => {
      const { adapter, sendRequest } = makeAdapter();
      const notification: Notification = {
        title: 'New translation ready',
        body: 'The French locale has been updated.',
        recipient: 'https://hooks.slack.com/services/T00/B00/xxx',
      };

      await adapter.send(notification);

      expect(sendRequest).toHaveBeenCalledOnce();
      expect(sendRequest).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/T00/B00/xxx',
        { text: '**New translation ready**\n\nThe French locale has been updated.' },
      );
    });

    it('should bold the title and separate body with double newline', async () => {
      const { adapter, sendRequest } = makeAdapter();
      const notification: Notification = {
        title: 'Alert',
        body: 'Something happened.',
        recipient: 'https://hooks.slack.com/services/webhook',
      };
      await adapter.send(notification);
      const [, payload] = sendRequest.mock.calls[0] as [string, { text: string }];
      expect(payload.text).toBe('**Alert**\n\nSomething happened.');
    });

    it('should return void (undefined) on success', async () => {
      const { adapter } = makeAdapter();
      const result = await adapter.send({
        title: 'T',
        body: 'B',
        recipient: 'https://hooks.slack.com/webhook',
      });
      expect(result).toBeUndefined();
    });

    it('should propagate errors thrown by sendRequest', async () => {
      const sendRequest = vi.fn().mockRejectedValue(new Error('Network error'));
      const adapter = new SlackNotificationAdapter({ sendRequest });
      await expect(
        adapter.send({ title: 'T', body: 'B', recipient: 'https://hooks.slack.com/x' }),
      ).rejects.toThrow('Network error');
    });

    it('should ignore metadata when building the request', async () => {
      const { adapter, sendRequest } = makeAdapter();
      await adapter.send({
        title: 'With metadata',
        body: 'Body',
        recipient: 'https://hooks.slack.com/webhook',
        metadata: { channel: '#general' },
      });
      const [, payload] = sendRequest.mock.calls[0] as [string, { text: string }];
      expect(payload).toEqual({ text: '**With metadata**\n\nBody' });
    });
  });
});
