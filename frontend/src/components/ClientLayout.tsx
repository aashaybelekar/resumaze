'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { getMe, logout, getGoogleLoginUrl } from '@/lib/api';
import { Clock, LogOut } from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push('/login');
    }
  }, [user, loading, isLoginPage, router]);

  // Poll for approval status when user is pending
  useEffect(() => {
    if (!user || user.approved || isLoginPage) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const fresh = await getMe();
        if (fresh.approved) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          await logout();
          await refresh();
          window.location.href = getGoogleLoginUrl();
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user, isLoginPage, refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isLoginPage) {
    return <div className="w-full">{children}</div>;
  }

  if (!user) return null;

  if (!user.approved) {
    const handleLogout = async () => {
      try { await logout(); } catch { /* ignore */ }
      await refresh();
      router.push('/login');
    };

    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Awaiting Approval</h1>
            <p className="text-sm text-slate-500 mb-1">
              Your account has been created but requires admin approval before you can access the app.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              You will be automatically redirected once approved.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-6">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Checking for approval...
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 justify-center mb-4">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </>
  );
}
