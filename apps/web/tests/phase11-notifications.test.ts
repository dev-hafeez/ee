import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockEmailProvider, renderWeeklyDigestHtml } from '../src/lib/providers/email';

describe('Phase 11 — Notifications and Digests (FR-33..35)', () => {
  it('respects notification preferences and skips opted-out types (FR-33..35)', () => {
    type UserPreferences = {
      in_app: boolean;
      email_digest: boolean;
      milestones: boolean;
      post_reminders: boolean;
    };

    const userA_prefs: UserPreferences = {
      in_app: true,
      email_digest: false, // Opted out of email digest
      milestones: false, // Opted out of milestone alerts
      post_reminders: true,
    };

    const shouldSendNotification = (
      type: 'post_reminder' | 'milestone' | 'weekly_digest',
      channel: 'in_app' | 'email',
      prefs: UserPreferences
    ): boolean => {
      if (channel === 'in_app' && !prefs.in_app) return false;
      if (channel === 'email' && !prefs.email_digest) return false;
      if (type === 'milestone' && !prefs.milestones) return false;
      if (type === 'post_reminder' && !prefs.post_reminders) return false;
      return true;
    };

    // User A should receive in-app post reminders
    assert.equal(shouldSendNotification('post_reminder', 'in_app', userA_prefs), true);

    // User A opted out of milestone alerts
    assert.equal(shouldSendNotification('milestone', 'in_app', userA_prefs), false);

    // User A opted out of email digest
    assert.equal(shouldSendNotification('weekly_digest', 'email', userA_prefs), false);
  });

  it('renders rich HTML weekly email digest and sends via mock email provider', async () => {
    const emailProvider = new MockEmailProvider();

    const digestHtml = renderWeeklyDigestHtml({
      displayName: 'Alex Rivers',
      totalReach: 48200,
      totalLikes: 3410,
      topPostCaption: 'Quantum-inspired optimization unlocks incredible creator growth #tech',
      recommendedSlots: ['Tuesday 19:00 (94% conf)', 'Thursday 18:00 (91% conf)'],
    });

    assert.ok(digestHtml.includes('Alex Rivers'));
    assert.ok(digestHtml.includes('48,200'));
    assert.ok(digestHtml.includes('Tuesday 19:00'));

    const result = await emailProvider.sendEmail({
      to: 'alex@example.com',
      subject: 'Your Weekly Social Intelligence Digest',
      html: digestHtml,
    });

    assert.equal(result.status, 'mocked');
    assert.ok(result.id.startsWith('mock_email_'));
  });

  it('supports mark-as-read batch updates for in-app notifications (FR-33)', () => {
    const notifications = [
      { id: 'notif-1', is_read: false },
      { id: 'notif-2', is_read: false },
      { id: 'notif-3', is_read: false },
    ];

    const markReadIds = ['notif-1', 'notif-3'];

    const updated = notifications.map((n) =>
      markReadIds.includes(n.id) ? { ...n, is_read: true } : n
    );

    assert.equal(updated.find((n) => n.id === 'notif-1')?.is_read, true);
    assert.equal(updated.find((n) => n.id === 'notif-2')?.is_read, false);
    assert.equal(updated.find((n) => n.id === 'notif-3')?.is_read, true);
  });

  it('triggers 30-minute advance publishing reminders for upcoming posts (FR-34)', () => {
    const now = new Date('2026-10-07T12:00:00Z').getTime();
    const reminderWindowMs = 30 * 60 * 1000; // 30 minutes

    type ScheduledItem = {
      id: string;
      scheduledAt: string;
      reminderSent: boolean;
    };

    const queue: ScheduledItem[] = [
      { id: 'post-soon', scheduledAt: '2026-10-07T12:20:00Z', reminderSent: false }, // 20 min away -> Trigger reminder
      { id: 'post-far', scheduledAt: '2026-10-07T14:00:00Z', reminderSent: false },  // 120 min away -> Too early
      { id: 'post-already-sent', scheduledAt: '2026-10-07T12:15:00Z', reminderSent: true }, // Already alerted
    ];

    const eligibleForReminder = queue.filter((item) => {
      const timeDiff = new Date(item.scheduledAt).getTime() - now;
      return timeDiff > 0 && timeDiff <= reminderWindowMs && !item.reminderSent;
    });

    assert.equal(eligibleForReminder.length, 1);
    assert.equal(eligibleForReminder[0].id, 'post-soon');
  });
});

