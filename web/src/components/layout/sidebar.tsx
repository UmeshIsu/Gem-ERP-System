'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  Boxes,
  ClipboardList,
  Flame,
  Gem,
  LayoutDashboard,
  Plane,
  Scissors,
  Settings,
  ShieldCheck,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/hooks';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // undefined = visible to all
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Operations',
    items: [
      { href: '/inventory', label: 'Inventory', icon: Boxes },
      { href: '/treatments', label: 'Heat Treatment', icon: Flame },
      { href: '/cutting', label: 'Cutting', icon: Scissors },
      { href: '/certifications', label: 'Certification', icon: Award },
      { href: '/exports', label: 'Exports & Sales', icon: Plane },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/financials', label: 'Financials', icon: Wallet, roles: ['MANAGER', 'FINANCE_OFFICER', 'VIEWER'] },
      { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['MANAGER', 'FINANCE_OFFICER', 'INVENTORY_OFFICER'] },
    ],
  },
  {
    section: 'Administration',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings, roles: [] },
      { href: '/audit', label: 'Audit Logs', icon: ShieldCheck, roles: ['MANAGER'] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const { data: company } = useCompany();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-700 shadow-lg shadow-blue-900/40">
          <Gem className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-wide text-white">
            {company?.companyName ?? 'AURA GEM'}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/60">
            Gemstone ERP
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV.map((group) => {
          const visible = group.items.filter((item) => (item.roles ? hasRole(...item.roles) : true));
          if (visible.length === 0) return null;
          return (
            <div key={group.section}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/45">
                {group.section}
              </div>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-accent text-white shadow-sm'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', active ? 'text-blue-300' : '')} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/50">
          <ClipboardList className="h-3.5 w-3.5" />
          AURA GEM ERP v1.0
        </div>
      </div>
    </aside>
  );
}
