import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RecommendationsClient } from './RecommendationsClient';

export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = user ? supabase : createAdminClient();

  const { data: accounts } = await db
    .from('social_accounts')
    .select('id, platform, handle')
    .limit(1);

  const accountId = accounts && accounts.length > 0 ? accounts[0].id : undefined;
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  return <RecommendationsClient accountId={accountId} aiServiceUrl={aiServiceUrl} />;
}
