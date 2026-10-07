'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth/rate-limiter';
import { createClient } from '@/lib/supabase/server';

async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headerStore.get('x-real-ip') || '127.0.0.1';
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const ip = await getClientIp();

  // 1. Rate limiting check (SRDS 4.2.5: 10 failures in 15 min)
  const rateLimit = await checkRateLimit(ip);
  if (rateLimit.blocked) {
    return {
      error: `Too many failed login attempts. IP blocked. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await recordFailedAttempt(ip);
    const updatedLimit = await checkRateLimit(ip);
    return {
      error: error.message,
      remainingAttempts: updatedLimit.remainingAttempts,
    };
  }

  // Check if user is suspended
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended, role')
      .eq('id', data.user.id)
      .single();

    if (profile?.suspended) {
      await supabase.auth.signOut();
      return {
        error: 'Your account is suspended. Please contact an administrator.',
      };
    }
  }

  await clearFailedAttempts(ip);
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  const headerStore = await headers();
  const origin =
    headerStore.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Check if session was created immediately or confirmation email sent
  if (data.user && !data.session) {
    return {
      success: true,
      message: 'Account created! Please check your email to verify your account before logging in.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function loginWithGoogle(): Promise<void> {
  const headerStore = await headers();
  const origin =
    headerStore.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const headerStore = await headers();
  const origin =
    headerStore.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: 'Password reset link sent! Check your email inbox.',
  };
}

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get('password') as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/login?message=Password updated successfully. Please log in.');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
