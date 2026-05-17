'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRole, getToken, ROLE_DASHBOARDS } from '@/app/lib/auth';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const role = getRole();
    if (role !== 'vendor') {
      const destination = role && ROLE_DASHBOARDS[role] ? ROLE_DASHBOARDS[role] : '/login';
      router.replace(destination);
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
