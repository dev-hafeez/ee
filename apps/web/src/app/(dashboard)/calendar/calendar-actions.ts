'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createScheduledPostAction(data: {
  caption: string;
  hashtags: string[];
  mediaType: string;
  scheduledAt: string;
  accountId?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  let accountId = data.accountId;
  if (!accountId) {
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    accountId = accounts?.[0]?.id;
  }

  if (!accountId) {
    return { error: 'No social account connected. Please connect an account in Settings first.' };
  }

  const { data: post, error } = await supabase
    .from('scheduled_posts')
    .insert({
      account_id: accountId,
      caption: data.caption,
      hashtags: data.hashtags,
      media_type: data.mediaType,
      scheduled_at: data.scheduledAt,
      status: 'SCHEDULED',
    })
    .select('id, caption, hashtags, media_type, scheduled_at, status')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/calendar');
  return { success: true, post };
}
