import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CalendarClient, CalendarPost } from './CalendarClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = user ? supabase : createAdminClient();

  const { data: scheduled } = await db
    .from('scheduled_posts')
    .select('id, caption, hashtags, media_type, scheduled_at, status')
    .order('scheduled_at', { ascending: true })
    .limit(50);

  const { data: accounts } = await db.from('social_accounts').select('id').limit(1);

  const { data: latestJob } = await db
    .from('optimization_jobs')
    .select('result')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let recommendedSlots: Array<{ day: string; hour: number; confidence: number }> = [];

  if (latestJob?.result?.primary_schedule?.slots) {
    recommendedSlots = latestJob.result.primary_schedule.slots.map(
      (s: { day: number; hour: number; confidence: number }) => ({
        day: dayNames[s.day % 7] || 'Mon',
        hour: s.hour,
        confidence: s.confidence || 0,
      })
    );
  }

  const initialPosts: CalendarPost[] = (scheduled || []).map((p) => ({
    id: p.id,
    caption: p.caption || '',
    hashtags: p.hashtags || [],
    media_type: p.media_type || 'image',
    scheduled_at: p.scheduled_at,
    status: p.status,
  }));

  return (
    <CalendarClient
      initialPosts={initialPosts}
      recommendedSlots={recommendedSlots}
      _accountId={accounts?.[0]?.id}
    />
  );
}
