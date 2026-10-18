'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const displayName = formData.get('displayName') as string;
  const bio = formData.get('bio') as string;
  const timezone = formData.get('timezone') as string;
  const benchmarkOptIn = formData.get('benchmarkOptIn') === 'true';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Attempt update including benchmark_opt_in
  let updatePayload: Record<string, any> = {
    display_name: displayName,
    bio: bio,
    timezone: timezone,
    benchmark_opt_in: benchmarkOptIn,
  };

  let { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  // If column does not exist on remote DB yet, retry without benchmark_opt_in
  if (error && error.code === '42703') {
    delete updatePayload.benchmark_opt_in;
    const retry = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);
    error = retry.error;
  }

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/analytics');
  return { success: true, message: 'Profile updated successfully.' };
}
