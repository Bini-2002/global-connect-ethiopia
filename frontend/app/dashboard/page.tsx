'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrganizerPortalRoute,
  getRoleFromToken,
  getVendorPortalRoute,
  ROLE_DASHBOARDS,
  getToken,
} from '@/app/lib/auth';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const role = getRoleFromToken(token);

      if (role === 'organizer') {
        const organizerRoute = await getOrganizerPortalRoute(token);
        router.replace(organizerRoute);
        return;
      }

      if (role === 'vendor') {
        const vendorRoute = await getVendorPortalRoute(token);
        router.replace(vendorRoute);
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
