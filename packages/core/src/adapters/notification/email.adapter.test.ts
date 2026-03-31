/**
 * Tests for EmailNotificationAdapter.
 *
 * @module adapters/notification/email.adapter.test
 */

import { describe, it, expect, vi } from 'vitest';
import { EmailNotificationAdapter } from './email.adapter';
import type { Notification } from '../../interfaces/notification-adapter';

describe('EmailNotificationAdapter', () => {
  const makeAdapter = () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const adapter = new EmailNotificationAdapter({ sendEmail });
    return { adapter, sendEmail };
  };

  // ---------------------------------------------------------------------------
  // channelId
  // ---------------------------------------------------------------------------

  it('should expose channelId "email"', () => {
    const { adapter } = makeAdapter();
    expect(adapter.channelId).toBe('email');
  });

  // ---------------------------------------------------------------------------
  // send
  // ---------------------------------------------------------------------------

  describe('send', () => {
    it('should call sendEmail with recipient as "to", title as subject, and body', async () => {
      const { adapter, sendEmail } = makeAdapter();
      const notification: Notification = {
        title: 'Translation review needed',
        body: 'Please review 5 pending translations.',
        recipient: 'alice@example.com',
      };

      await adapter.send(notification);

      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'Translation review needed',
        'Please review 5 pending translations.',
      );
    });

    it('should return void (undefined) on success', async () => {
      const { adapter } = makeAdapter();
      const notification: Notification = {
        title: 'Hello',
        body: 'World',
        recipient: 'bob@example.com',
      };
      const result = await adapter.send(notification);
      expect(result).toBeUndefined();
    });

    it('should propagate errors thrown by sendEmail', async () => {
      const sendEmail = vi.fn().mockRejectedValue(new Error('SMTP failure'));
      const adapter = new EmailNotificationAdapter({ sendEmail });
      const notification: Notification = {
        title: 'Fail',
        body: 'This will fail',
        recipient: 'err@example.com',
      };
      await expect(adapter.send(notification)).rejects.toThrow('SMTP failure');
    });

    it('should pass metadata-free notification without error', async () => {
      const { adapter, sendEmail } = makeAdapter();
      const notification: Notification = {
        title: 'No metadata',
        body: 'Body text',
        recipient: 'test@example.com',
      };
      await adapter.send(notification);
      expect(sendEmail).toHaveBeenCalledOnce();
    });

    it('should handle notification with metadata without forwarding it to sendEmail', async () => {
      const { adapter, sendEmail } = makeAdapter();
      const notification: Notification = {
        title: 'With metadata',
        body: 'Body text',
        recipient: 'meta@example.com',
        metadata: { priority: 'high', templateId: 'tpl-001' },
      };
      await adapter.send(notification);
      expect(sendEmail).toHaveBeenCalledWith(
        'meta@example.com',
        'With metadata',
        'Body text',
      );
    });
  });
});
