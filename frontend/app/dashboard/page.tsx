'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrganizerPortalRoute,
  getRole,
  isLoggedIn,
  ROLE_DASHBOARDS,
} from '@/app/lib/auth';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      if (!isLoggedIn()) {
        router.replace('/login');
        return;
      }

      const role = getRole();

      if (role === 'organizer') {
        const organizerRoute = await getOrganizerPortalRoute();
        router.replace(organizerRoute);
        return;
      }

      const dest = role ? ROLE_DASHBOARDS[role] ?? '/' : '/';
      router.replace(dest);
    };

    void redirectUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Redirecting to your portal...</p>
      </div>
    </div>
  );
}
