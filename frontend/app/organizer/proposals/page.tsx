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
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600' },
  changes_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700' },
};

export default function OrganizerProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    api.get<Proposal[]>('/proposals/').then(setProposals).catch(console.error).finally(() => setLoading(false));
  }, [router]);

  const filtered = proposals.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    (p.event_type || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search proposals..." onSearch={setQuery} />
      <main className="ml-60 pt-16 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[#062E22]">My Proposals</h1>
            <p className="text-slate-500 text-sm mt-1">{proposals.length} total proposals</p>
          </div>
          <Link
            href="/organizer/proposals/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Proposal
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in delay-100">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-2">Proposal Title</div>
            <div>Type</div>
            <div>Status</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-5xl">📋</span>
              <p className="text-slate-500 text-sm mt-3">No proposals found.</p>
              <Link href="/organizer/proposals/create" className="mt-4 inline-block text-sm text-[#062E22] font-semibold underline">Create your first proposal →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(p => {
                const cfg = STATUS_CONFIG[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={p.id} className="grid grid-cols-5 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition">
                    <div className="col-span-2">
                      <p className="font-medium text-[#062E22] text-sm">{p.title}</p>
                      <p className="text-xs text-slate-400">{p.location}</p>
                    </div>
                    <div className="text-sm text-slate-600">{p.event_type || '—'}</div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    <div className="text-right">
                      <Link href={`/organizer/proposals/${p.id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium">Open</Link>
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
