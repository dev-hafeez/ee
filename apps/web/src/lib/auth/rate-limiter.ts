import { createAdminClient } from '@/lib/supabase/admin';

// In-memory tracker ensures rate limiting works reliably across both tests and runtime
const memoryAttempts = new Map<string, number[]>();

const MAX_FAILURES = 10;
const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

export async function checkRateLimit(ip: string): Promise<{
  blocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}> {
  const now = Date.now();

  // Check database first if configured
  try {
    const supabase = createAdminClient();
    const windowStart = new Date(now - WINDOW_MS).toISOString();

    const { count, error } = await supabase
      .from('auth_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('at', windowStart);

    if (!error && typeof count === 'number' && count > 0) {
      if (count >= MAX_FAILURES) {
        return { blocked: true, remainingAttempts: 0, retryAfterSeconds: WINDOW_MINUTES * 60 };
      }
      return {
        blocked: false,
        remainingAttempts: MAX_FAILURES - count,
        retryAfterSeconds: 0,
      };
    }
  } catch {
    // Fall back to memory tracker
  }

  // Memory tracker fallback
  const attempts = (memoryAttempts.get(ip) || []).filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );
  memoryAttempts.set(ip, attempts);

  if (attempts.length >= MAX_FAILURES) {
    const oldestAttempt = Math.min(...attempts);
    const retryAfter = Math.ceil((oldestAttempt + WINDOW_MS - now) / 1000);
    return { blocked: true, remainingAttempts: 0, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  return {
    blocked: false,
    remainingAttempts: MAX_FAILURES - attempts.length,
    retryAfterSeconds: 0,
  };
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  const now = Date.now();
  const attempts = (memoryAttempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  attempts.push(now);
  memoryAttempts.set(ip, attempts);

  try {
    const supabase = createAdminClient();
    await supabase.from('auth_attempts').insert({ ip, at: new Date().toISOString() });
  } catch {
    // Non-fatal if DB insert fails in unit tests
  }
}

export async function clearFailedAttempts(ip: string): Promise<void> {
  memoryAttempts.delete(ip);

  try {
    const supabase = createAdminClient();
    await supabase.from('auth_attempts').delete().eq('ip', ip);
  } catch {
    // Non-fatal if DB clear fails in unit tests
  }
}
