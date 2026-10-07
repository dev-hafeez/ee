'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Recommendations', href: '/recommendations', icon: '💡' },
  { name: 'Calendar', href: '/calendar', icon: '📅' },
  { name: 'Notifications', href: '/notifications', icon: '🔔' },
  { name: 'Onboarding', href: '/onboarding', icon: '🧭' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between border-r border-zinc-200 bg-white">
      <div>
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#373E3E] text-white">
            <span className="font-mono text-sm font-bold">EE</span>
          </div>
          <div>
            <h1 className="text-base leading-tight font-bold text-[#373E3E]">Entangled Echo</h1>
            <span className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
              Quantum Optimizer
            </span>
          </div>
        </div>

        <nav className="space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-zinc-100 font-semibold text-[#373E3E]'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-100 p-4">
        <Link
          href="/admin"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <span>Admin Portal</span>
          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-700">FR-06</span>
        </Link>
      </div>
    </aside>
  );
}
