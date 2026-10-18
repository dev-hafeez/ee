import { createClient } from '@/lib/supabase/server';
import { RecommendationsClient, type OptimizationResult } from './RecommendationsClient';

export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accounts: Array<{
    id: string;
    platform: string;
    handle: string;
    is_synthetic?: boolean;
  }> = [];

  if (user) {
    const { data } = await supabase
      .from('social_accounts')
      .select('id, platform, handle, is_synthetic')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    accounts = data || [];
  }

  // Pre-load the latest optimization result if available for default account
  let initialOptimization: OptimizationResult | null = null;
  const initialAccountId = accounts.length > 0 ? accounts[0].id : undefined;

  if (initialAccountId) {
    const { data: jobData } = await supabase
      .from('optimization_jobs')
      .select('id, status, result, created_at, finished_at')
      .eq('account_id', initialAccountId)
      .eq('status', 'DONE')
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobData && jobData.length > 0) {
      const job = jobData[0];
      const res = (job.result as Record<string, unknown>) || {};
      initialOptimization = {
        job_id: job.id,
        status: job.status,
        primary_schedule: res.primary_schedule,
        alternatives: res.alternatives,
        low_data: res.low_data,
        explanation: res.explanation,
        explanation_source: res.explanation_source,
        posts_evaluated: res.posts_evaluated,
        created_at: job.created_at,
        finished_at: job.finished_at,
      } as OptimizationResult;
    }
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  return (
    <RecommendationsClient
      accounts={accounts}
      initialAccountId={initialAccountId}
      initialOptimization={initialOptimization}
      aiServiceUrl={aiServiceUrl}
    />
  );
}
