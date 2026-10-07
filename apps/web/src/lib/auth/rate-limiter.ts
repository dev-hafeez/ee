import { createAdminClient } from '@/lib/supabase/admin';

// In-memory fallback tracker for offline/mock development
const memoryAttempts = new Map<string, number[]>();

const MAX_FAILURES = 10;
const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

export async function checkRateLimit(ip: string): Promise<{
  blocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}> {
  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const now = Date.now();

  if (isPlaceholder) {
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

  // Database-backed check via auth_attempts table
  try {
    const supabase = createAdminClient();
    const windowStart = new Date(now - WINDOW_MS).toISOString();

    const { count, error } = await supabase
      .from('auth_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('at', windowStart);

    if (error) throw error;

    const failureCount = count || 0;
    if (failureCount >= MAX_FAILURES) {
      return { blocked: true, remainingAttempts: 0, retryAfterSeconds: WINDOW_MINUTES * 60 };
    }

    return {
      blocked: false,
      remainingAttempts: MAX_FAILURES - failureCount,
      retryAfterSeconds: 0,
    };
  } catch {
    // If DB check fails, fallback to memory
    const attempts = (memoryAttempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    return {
      blocked: attempts.length >= MAX_FAILURES,
      remainingAttempts: Math.max(0, MAX_FAILURES - attempts.length),
      retryAfterSeconds: WINDOW_MINUTES * 60,
    };
  }
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const now = Date.now();
  const attempts = (memoryAttempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  attempts.push(now);
  memoryAttempts.set(ip, attempts);

  if (!isPlaceholder) {
    try {
      const supabase = createAdminClient();
      await supabase.from('auth_attempts').insert({ ip, at: new Date().toISOString() });
    } catch (e) {
      console.error('Failed to log auth attempt to Postgres:', e);
    }
  }
}

export async function clearFailedAttempts(ip: string): Promise<void> {
  memoryAttempts.delete(ip);

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (!isPlaceholder) {
    try {
      const supabase = createAdminClient();
      await supabase.from('auth_attempts').delete().eq('ip', ip);
    } catch (e) {
      console.error('Failed to clear auth attempts from Postgres:', e);
    }
  }
}
