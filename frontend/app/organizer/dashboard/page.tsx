'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { isLoggedIn } from '@/app/lib/auth';

interface Proposal {
  id: string;
  title: string;
  event_type?: string;
  location?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', cls: 'bg-amber-100 text-amber-700' },
  ministry_review: { label: 'Ministry Review', cls: 'bg-blue-100 text-blue-700' },
  ministry_approved: { label: 'Ministry Approved', cls: 'bg-teal-100 text-teal-700' },
  municipal_review: { label: 'Municipal Review', cls: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved ✓', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  changes_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700' },
};

export default function OrganizerDashboard() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    api.get<Proposal[]>('/proposals/').then(setProposals).catch(console.error).finally(() => setLoading(false));
  }, [router]);

  const counts = {
    draft: proposals.filter(p => p.status === 'draft').length,
    submitted: proposals.filter(p => ['submitted','ministry_review','ministry_approved','municipal_review'].includes(p.status)).length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search proposals..." />
      <main className="ml-60 pt-16 p-8">
        {/* Welcome */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-[#062E22]">Organizer Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your event proposals and permits.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Draft', count: counts.draft, color: 'border-l-slate-400' },
            { label: 'In Review', count: counts.submitted, color: 'border-l-amber-400' },
            { label: 'Approved', count: counts.approved, color: 'border-l-green-500' },
            { label: 'Rejected', count: counts.rejected, color: 'border-l-red-400' },
          ].map((s, i) => (
            <div key={s.label} className={`bg-white rounded-xl p-5 border-l-4 ${s.color} shadow-sm animate-fade-in delay-${(i+1)*100}`}>
              <p className="text-2xl font-bold text-[#062E22]">{s.count}</p>
              <p className="text-slate-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8 animate-fade-in delay-200">
          <Link href="/organizer/proposals/create" className="px-4 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Proposal
          </Link>
          <Link href="/organizer/proposals" className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 transition flex items-center gap-2">
            View All Proposals
          </Link>
        </div>

        {/* Recent Proposals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in delay-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-[#062E22]">Recent Proposals</h2>
            <Link href="/organizer/proposals" className="text-xs text-[#062E22] font-medium hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
          ) : proposals.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-5xl">📋</span>
              <p className="text-slate-500 mt-3 text-sm">No proposals yet.</p>
              <Link href="/organizer/proposals/create" className="mt-4 inline-block text-sm text-[#062E22] font-semibold underline">Create your first proposal →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {proposals.slice(0, 5).map(p => {
                const cfg = STATUS_CONFIG[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition">
                    <div>
                      <p className="font-medium text-[#062E22] text-sm">{p.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.event_type} • {p.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                      <Link href={`/organizer/proposals/${p.id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition">Open</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
