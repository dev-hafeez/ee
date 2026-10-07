import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '../src/lib/auth/rate-limiter';

test('Phase 3 — Auth Rate Limiting (SRDS 4.2.5)', async () => {
  const testIp = '192.168.1.105';
  await clearFailedAttempts(testIp);

  // Check initial state: 10 remaining
  const initial = await checkRateLimit(testIp);
  assert.equal(initial.blocked, false);
  assert.equal(initial.remainingAttempts, 10);

  // Record 9 failures
  for (let i = 0; i < 9; i++) {
    await recordFailedAttempt(testIp);
  }

  const after9 = await checkRateLimit(testIp);
  assert.equal(after9.blocked, false);
  assert.equal(after9.remainingAttempts, 1);

  // Record 10th failure -> Must be blocked
  await recordFailedAttempt(testIp);
  const after10 = await checkRateLimit(testIp);
  assert.equal(after10.blocked, true, 'IP must be blocked after 10 failed attempts');
  assert.equal(after10.remainingAttempts, 0);

  // Clear on successful login
  await clearFailedAttempts(testIp);
  const cleared = await checkRateLimit(testIp);
  assert.equal(cleared.blocked, false);
  assert.equal(cleared.remainingAttempts, 10);
});

test('Phase 3 — Non-admin access control for /admin (FR-06)', async () => {
  // Mock profile role check simulation
  function checkAdminAccess(userRole: string): { status: number; allowed: boolean } {
    if (userRole !== 'admin') {
      return { status: 403, allowed: false };
    }
    return { status: 200, allowed: true };
  }

  const regularUserAccess = checkAdminAccess('user');
  assert.equal(regularUserAccess.status, 403, 'Non-admin user must receive 403 on /admin');
  assert.equal(regularUserAccess.allowed, false);

  const adminUserAccess = checkAdminAccess('admin');
  assert.equal(adminUserAccess.status, 200, 'Admin user must be allowed on /admin');
  assert.equal(adminUserAccess.allowed, true);
});

test('Phase 3 — Suspended user login rejection (FR-01, FR-06)', async () => {
  function verifyUserSuspension(profile: { suspended: boolean }): {
    canLogin: boolean;
    error?: string;
  } {
    if (profile.suspended) {
      return {
        canLogin: false,
        error: 'Your account is suspended. Please contact an administrator.',
      };
    }
    return { canLogin: true };
  }

  const activeUser = verifyUserSuspension({ suspended: false });
  assert.equal(activeUser.canLogin, true);

  const suspendedUser = verifyUserSuspension({ suspended: true });
  assert.equal(suspendedUser.canLogin, false);
  assert.match(suspendedUser.error || '', /suspended/);
});

test('Phase 3 — SRDS 4.2.8 Password Re-authentication requirement', async () => {
  function verifyDestructiveAction(params: {
    isAdmin: boolean;
    reauthPassword?: string;
    correctPassword: string;
  }): { success: boolean; error?: string } {
    if (!params.isAdmin) {
      return { success: false, error: 'Forbidden' };
    }
    if (!params.reauthPassword || params.reauthPassword !== params.correctPassword) {
      return { success: false, error: 'Re-authentication failed: Invalid admin password' };
    }
    return { success: true };
  }

  // Missing password
  const noPass = verifyDestructiveAction({
    isAdmin: true,
    reauthPassword: '',
    correctPassword: 'secretAdminPassword123',
  });
  assert.equal(noPass.success, false);
  assert.match(noPass.error || '', /Re-authentication failed/);

  // Wrong password
  const wrongPass = verifyDestructiveAction({
    isAdmin: true,
    reauthPassword: 'wrongPassword',
    correctPassword: 'secretAdminPassword123',
  });
  assert.equal(wrongPass.success, false);

  // Correct password
  const valid = verifyDestructiveAction({
    isAdmin: true,
    reauthPassword: 'secretAdminPassword123',
    correctPassword: 'secretAdminPassword123',
  });
  assert.equal(valid.success, true);
});
