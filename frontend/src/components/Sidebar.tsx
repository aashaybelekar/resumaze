'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Upload,
  BarChart3,
  Briefcase,
  Circle,
  Archive,
  LogOut,
} from 'lucide-react';
import { checkHealth, logout } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const baseNavItems = [
  { href: '/pipeline', label: 'Pipeline', icon: LayoutDashboard },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [healthy, setHealthy] = useState<boolean | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore errors — cookies will be cleared server-side regardless
    }
    await refresh();
    router.push('/login');
  };

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
        {[...baseNavItems, ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Archive }] : [])].map(({ href, label, icon: Icon }) => {
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
      <div className="px-5 py-3 border-t border-slate-700">
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

      {/* User info + logout */}
      {user && (
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-slate-200 text-sm font-medium truncate">{user.name}</p>
              <p className="text-slate-400 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
