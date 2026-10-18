import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { RealtimeListener } from '@/components/realtime/RealtimeListener';
import { getCachedAuthUser, getCachedProfile } from '@/lib/supabase/cached';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedAuthUser();
  const profile = user ? await getCachedProfile(user.id) : null;

  const email = user?.email || '';
  const displayName = profile?.display_name || '';

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={email} displayName={displayName} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
      <RealtimeListener />
    </div>
  );
}
