import fs from 'fs';
import path from 'path';

const envPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

import { createAdminClient } from '../apps/web/src/lib/supabase/admin';
import { syncAccountData } from '../apps/web/src/lib/sync/sync-account';

async function main() {
  const supabase = createAdminClient();
  const { data: accounts, error } = await supabase.from('social_accounts').select('id, handle, platform, user_id');
  if (error || !accounts) {
    console.error('Failed to list accounts:', error);
    process.exit(1);
  }

  console.log(`Found ${accounts.length} social accounts to sync...`);
  for (const acc of accounts) {
    try {
      console.log(`Syncing account ${acc.id} (@${acc.handle} on ${acc.platform})...`);
      const result = await syncAccountData(acc.id, acc.user_id);
      console.log(`  -> Synced ${result.syncedPosts} posts in ${result.durationMs}ms`);
    } catch (err: unknown) {
      console.error(`  -> Failed to sync account ${acc.id}:`, err);
    }
  }

  const { count } = await supabase.from('posts').select('id', { count: 'exact' });
  console.log(`\nDone! Total posts in database now: ${count}`);
}

main().catch(console.error);
