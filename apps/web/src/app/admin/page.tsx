import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminClient, UserRow } from './AdminClient';

export default async function AdminPage() {
  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  let users: UserRow[] = [];

  if (isPlaceholder) {
    // Mock user dataset for offline development & testing
    users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'alex@creator.com',
        displayName: 'Alex Rivers',
        role: 'user',
        suspended: false,
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'jordan@agency.io',
        displayName: 'Jordan Smith',
        role: 'user',
        suspended: true,
        createdAt: '2026-02-01T12:30:00Z',
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'admin@entangledecho.com',
        displayName: 'Chief Administrator',
        role: 'admin',
        suspended: false,
        createdAt: '2026-01-01T08:00:00Z',
      },
    ];
  } else {
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

    users = (dbProfiles || []).map((p) => ({
      id: p.id,
      email: authMap.get(p.id) || 'unknown@user.com',
      displayName: p.display_name || '',
      role: p.role,
      suspended: p.suspended,
      createdAt: p.created_at,
    }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminClient initialUsers={users} />
    </div>
  );
}
