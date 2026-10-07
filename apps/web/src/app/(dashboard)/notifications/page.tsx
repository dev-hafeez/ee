import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationsClient, NotificationItem } from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = user ? supabase : createAdminClient();

  const { data: notifications } = await db
    .from('notifications')
    .select('id, type, message, is_read, sent_at')
    .order('sent_at', { ascending: false })
    .limit(50);

  const initialNotifications: NotificationItem[] = (notifications || []).map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    is_read: n.is_read,
    sent_at: n.sent_at,
  }));

  return <NotificationsClient initialNotifications={initialNotifications} />;
}
