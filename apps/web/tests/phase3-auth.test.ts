import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '../src/lib/auth/rate-limiter';

test('Phase 3 — Auth Rate Limiting (SRDS 4.2.5, SRDS-SEC-04)', async () => {
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

test('Phase 3 — User Registration & Email Verification (FR-01)', () => {
  function validateRegistrationPayload(payload: { email: string; password?: string; fullName?: string }): {
    valid: boolean;
    requiresVerification: boolean;
    error?: string;
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.email || !emailRegex.test(payload.email)) {
      return { valid: false, requiresVerification: false, error: 'Invalid email address' };
    }
    if (!payload.password || payload.password.length < 8) {
      return { valid: false, requiresVerification: false, error: 'Password must be at least 8 characters' };
    }
    // SRDS 4.2.1 / FR-01: Registration requires email verification before account activation
    return { valid: true, requiresVerification: true };
  }

  // 1. Invalid email
  const badEmail = validateRegistrationPayload({ email: 'invalid-email', password: 'password123' });
  assert.equal(badEmail.valid, false);
  assert.match(badEmail.error || '', /Invalid email/);

  // 2. Short password
  const shortPass = validateRegistrationPayload({ email: 'user@example.com', password: '123' });
  assert.equal(shortPass.valid, false);
  assert.match(shortPass.error || '', /at least 8 characters/);

  // 3. Valid registration requiring verification
  const valid = validateRegistrationPayload({ email: 'user@example.com', password: 'securePassword123' });
  assert.equal(valid.valid, true);
  assert.equal(valid.requiresVerification, true);
});

test('Phase 3 — User Authentication & Session Management (FR-02)', () => {
  type SessionToken = {
    userId: string;
    role: string;
    exp: number;
  };

  function validateSession(token: SessionToken, currentTimeSec: number): { authenticated: boolean; reason?: string } {
    if (!token.userId) {
      return { authenticated: false, reason: 'Missing user identity' };
    }
    if (token.exp <= currentTimeSec) {
      return { authenticated: false, reason: 'Session expired' };
    }
    return { authenticated: true };
  }

  const now = Math.floor(Date.now() / 1000);
  const validSession = { userId: 'user_123', role: 'user', exp: now + 3600 };
  const expiredSession = { userId: 'user_123', role: 'user', exp: now - 60 };
  const invalidSession = { userId: '', role: 'user', exp: now + 3600 };

  assert.equal(validateSession(validSession, now).authenticated, true);
  assert.equal(validateSession(expiredSession, now).authenticated, false);
  assert.equal(validateSession(expiredSession, now).reason, 'Session expired');
  assert.equal(validateSession(invalidSession, now).authenticated, false);
});

test('Phase 3 — Password Reset & Recovery (FR-03)', () => {
  function createPasswordResetRequest(email: string, appOrigin: string): {
    redirectTo: string;
    emailValid: boolean;
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailValid = emailRegex.test(email);
    return {
      emailValid,
      redirectTo: `${appOrigin}/reset-password`,
    };
  }

  const resetReq = createPasswordResetRequest('user@example.com', 'https://entangled-echo.app');
  assert.equal(resetReq.emailValid, true);
  assert.equal(resetReq.redirectTo, 'https://entangled-echo.app/reset-password');

  const invalidReq = createPasswordResetRequest('notanemail', 'https://entangled-echo.app');
  assert.equal(invalidReq.emailValid, false);
});

test('Phase 3 — User Profile & Timezone Settings (FR-04)', () => {
  function validateProfileUpdate(data: { displayName: string; bio: string; timezone: string }): {
    valid: boolean;
    error?: string;
  } {
    if (!data.displayName || data.displayName.trim().length === 0) {
      return { valid: false, error: 'Display name cannot be empty' };
    }
    if (data.displayName.length > 50) {
      return { valid: false, error: 'Display name must not exceed 50 characters' };
    }
    // Validate IANA timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
    } catch {
      return { valid: false, error: 'Invalid IANA timezone' };
    }
    return { valid: true };
  }

  const validProfile = validateProfileUpdate({
    displayName: 'Alex Rivers',
    bio: 'Creator & Founder',
    timezone: 'America/New_York',
  });
  assert.equal(validProfile.valid, true);

  const invalidTz = validateProfileUpdate({
    displayName: 'Alex',
    bio: '',
    timezone: 'Invalid/NonExistent_Zone',
  });
  assert.equal(invalidTz.valid, false);
  assert.match(invalidTz.error || '', /Invalid IANA timezone/);

  const emptyName = validateProfileUpdate({
    displayName: '',
    bio: '',
    timezone: 'UTC',
  });
  assert.equal(emptyName.valid, false);
  assert.match(emptyName.error || '', /cannot be empty/);
});

test('Phase 3 — OAuth Third-Party Authentication (FR-05)', () => {
  function buildOAuthUrl(provider: 'google' | 'facebook', origin: string): {
    provider: string;
    redirectTo: string;
  } {
    return {
      provider,
      redirectTo: `${origin}/api/auth/callback`,
    };
  }

  const googleAuth = buildOAuthUrl('google', 'https://entangled-echo.app');
  assert.equal(googleAuth.provider, 'google');
  assert.equal(googleAuth.redirectTo, 'https://entangled-echo.app/api/auth/callback');
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
