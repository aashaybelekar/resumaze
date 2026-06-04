'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Upload,
  BarChart3,
  Settings,
  Briefcase,
  Circle,
  Archive,
} from 'lucide-react';
import { checkHealth } from '@/lib/api';

const navItems = [
  { href: '/pipeline', label: 'Pipeline', icon: LayoutDashboard },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Archive },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
    const interval = setInterval(() => {
      checkHealth()
        .then(() => setHealthy(true))
        .catch(() => setHealthy(false));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ backgroundColor: '#1e293b' }}>
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-400" />
          <span className="text-white font-bold text-lg tracking-tight">Resumaze ATS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === '/pipeline' && pathname === '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Health indicator */}
      <div className="px-5 py-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <Circle
            className={`w-2.5 h-2.5 fill-current ${
              healthy === null
                ? 'text-yellow-400'
                : healthy
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          />
          <span className="text-slate-400 text-xs">
            API{' '}
            {healthy === null ? 'checking...' : healthy ? 'connected' : 'offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
