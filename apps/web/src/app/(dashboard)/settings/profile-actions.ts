'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const displayName = formData.get('displayName') as string;
  const bio = formData.get('bio') as string;
  const timezone = formData.get('timezone') as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      bio: bio,
      timezone: timezone,
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  return { success: true, message: 'Profile updated successfully.' };
}
