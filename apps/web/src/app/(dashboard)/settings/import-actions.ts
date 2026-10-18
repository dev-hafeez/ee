'use server';

import { createClient } from '@/lib/supabase/server';
import { importPostHistory, ImportSummary } from '@/lib/providers/social/csv-importer';
import { revalidatePath } from 'next/cache';

export async function importPostHistoryAction(
  accountId: string,
  rawFileText: string
): Promise<{ success: boolean; summary?: ImportSummary; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Please log in' };
    }

    // Verify ownership of the account
    const { data: account, error: accError } = await supabase
      .from('social_accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accError || !account) {
      return { success: false, error: 'Account not found or access denied' };
    }

    const summary = await importPostHistory(accountId, rawFileText);

    if (summary.importedPosts === 0 && summary.errors.length > 0) {
      return { success: false, summary, error: summary.errors.join(', ') };
    }

    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    revalidatePath('/settings');

    return { success: true, summary };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Import failed';
    return { success: false, error: msg };
  }
}
