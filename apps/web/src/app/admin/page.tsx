import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminClient, UserRow } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/admin');
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-bold text-red-700">403 — Forbidden</h1>
          <p className="mt-2 text-sm text-red-600">
            Administrator privileges are required to view this panel.
          </p>
        </div>
      </div>
    );
  }

  const adminSupabase = createAdminClient();
  const { data: dbProfiles } = await adminSupabase
    .from('profiles')
    .select('id, display_name, role, suspended, created_at');

  const {
    data: { users: authUsers },
  } = await adminSupabase.auth.admin.listUsers();

  const authMap = new Map((authUsers || []).map((u) => [u.id, u.email || '']));

  const users: UserRow[] = (dbProfiles || []).map((p) => ({
    id: p.id,
    email: authMap.get(p.id) || '',
    displayName: p.display_name || '',
    role: p.role,
    suspended: p.suspended,
    createdAt: p.created_at,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminClient initialUsers={users} />
    </div>
  );
}
