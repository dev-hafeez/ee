'use server';

import { createClient } from '@/lib/supabase/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET || '';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (AI_SERVICE_SECRET) {
    headers['Authorization'] = `Bearer ${AI_SERVICE_SECRET}`;
  }
  return headers;
}

export async function runQuboOptimizerAction(
  accountId: string,
  postsPerWeek: number,
  minGapHours: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/optimize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: user.id,
        account_id: accountId,
        posts_per_week: postsPerWeek,
        min_gap_hours: minGapHours,
        horizon_days: 7,
        blackout_slots: [],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Optimization service returned ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to contact AI optimizer service: ${message}` };
  }
}

export async function getLatestOptimizationAction(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/optimize/latest?account_id=${encodeURIComponent(accountId)}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (res.status === 404) {
      return { success: false, notFound: true };
    }

    if (!res.ok) {
      const err = await res.text();
      return { error: `Optimization service returned ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to fetch latest optimization: ${message}` };
  }
}

export async function generateCaptionsAction(accountId: string, niche?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/recommend`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: user.id,
        account_id: accountId,
        type: 'caption',
        niche: niche?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Recommendation service returned ${res.status}: ${err}` };
    }

    const rec = await res.json();
    return {
      success: true,
      captions: rec.content?.captions || [],
      source: rec.content?.source || 'Gemini (gemini-3.1-flash-lite-preview)',
      latencyMs: rec.content?.latency_ms || 0,
      basedOnNPosts: rec.content?.based_on_n_posts || 0,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to generate captions: ${message}` };
  }
}

export async function decomposeGoalAction(
  goal: string,
  platform: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/decompose`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: user.id,
        goal,
        platform,
        start_date: startDate,
        end_date: endDate,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Decomposition service returned ${res.status}: ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      tasks: data.tasks || [],
      source: data.source || 'Gemini (gemini-3.1-flash-lite-preview)',
      latencyMs: data.latency_ms || 0,
      tokensUsed: data.tokens_used || 0,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to decompose campaign: ${message}` };
  }
}

export async function chatWithAssistantAction(message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: user.id,
        message,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Assistant service returned ${res.status}: ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      reply: data.reply,
      source: data.source,
      grounded: data.grounded,
      latencyMs: data.latency_ms,
    };
  } catch (err: unknown) {
    const message_str = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to contact AI assistant: ${message_str}` };
  }
}

export async function generateImageAction(prompt: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/image/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: user.id,
        prompt,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Image generation returned ${res.status}: ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      url: data.url,
      provider: data.provider,
      label: data.label,
      remainingDaily: data.remaining_daily,
    };
  } catch (err: unknown) {
    const message_str = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to generate image: ${message_str}` };
  }
}
