'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function verifyCurrentAdmin(
  reauthPassword?: string
): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized: User is not authenticated' };
  }

  // Check role in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, error: 'Forbidden: Requires admin privileges' };
  }

  // SRDS 4.2.8: Destructive actions require re-authentication (re-enter password)
  if (reauthPassword) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: reauthPassword,
    });

    if (signInError) {
      return { authorized: false, error: 'Re-authentication failed: Invalid admin password' };
    }
  }

  return { authorized: true };
}

export async function toggleSuspendUser(
  userId: string,
  currentStatus: boolean,
  reauthPassword: string
) {
  const check = await verifyCurrentAdmin(reauthPassword);
  if (!check.authorized) {
    return { error: check.error };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ suspended: !currentStatus })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function deleteUser(userId: string, reauthPassword: string) {
  const check = await verifyCurrentAdmin(reauthPassword);
  if (!check.authorized) {
    return { error: check.error };
  }

  const adminClient = createAdminClient();

  // Delete from auth.users (cascades to profiles and all user data)
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}
