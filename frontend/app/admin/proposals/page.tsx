'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

export default function AdminProposalsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/organizers');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#EC5B13]">Workflow Update</p>
          <h1 className="mt-3 text-3xl font-bold text-[#062E22]">Event proposal approval is no longer handled by admin</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Proposal approval now goes directly through the selected ministry office and then the selected municipal office.
            Admin remains focused on organizer and vendor verification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/organizers"
              className="rounded-xl bg-[#062E22] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
            >
              Open Organizer Approvals
            </Link>
            <Link
              href="/admin/vendors"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Open Vendor Approvals
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-400">Redirecting to organizer approvals...</p>
        </div>
      </main>
    </div>
  );
}
