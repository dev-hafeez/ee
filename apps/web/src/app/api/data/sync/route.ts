import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAccountData } from '@/lib/sync/sync-account';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Verify user authorization unless internal tick secret is provided
    const authHeader = request.headers.get('authorization');
    const tickSecret = process.env.INTERNAL_TICK_SECRET;
    const isInternal = tickSecret && authHeader === `Bearer ${tickSecret}`;

    let authenticatedUserId: string | undefined = undefined;
    if (!isInternal) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      authenticatedUserId = user.id;

      // Verify the user owns the account
      const { data: account, error: accError } = await supabase
        .from('social_accounts')
        .select('id, user_id')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (accError || !account) {
        return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 });
      }
    }

    const result = await syncAccountData(accountId, authenticatedUserId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
