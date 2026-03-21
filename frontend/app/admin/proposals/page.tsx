'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';

interface Proposal {
  id: string;
  title: string;
  event_type?: string;
  organizer_id: string;
  status: string;
  updated_at: string;
}

const STATUS_BADGES: Record<string, {label: string; cls: string; dot: string}> = {
  submitted: { label: 'Submitted (Waiting Admin)', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  under_review: { label: 'Under Review', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  ministry_review: { label: 'Ministry Review', cls: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400' },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
};

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending'>('pending');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get<Proposal[]>('/proposals/').then(setProposals).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = proposals.filter(p => {
    if (tab === 'pending' && p.status !== 'submitted') return false;
    return p.title.toLowerCase().includes(query.toLowerCase()) || p.organizer_id.toLowerCase().includes(query.toLowerCase());
  });
  const pendingCount = proposals.filter(p => p.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader searchPlaceholder="Search proposals..." onSearch={setQuery} />
      <main className="ml-60 pt-16 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[#062E22]">Admin Review Queue</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and evaluate proposals currently in 'Submitted' status.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-100 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Data
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 animate-fade-in delay-100">
          <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === 'all' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
            All Proposals
          </button>
          <button onClick={() => setTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${tab === 'pending' ? 'bg-[#062E22] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            Submitted (Waiting Admin)
            {pendingCount > 0 && <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${tab === 'pending' ? 'bg-white text-[#062E22]' : 'bg-[#062E22] text-white'}`}>{pendingCount}</span>}
          </button>
          <button className="px-4 py-2 rounded-full text-sm font-medium text-slate-500 hover:bg-slate-100 transition">Urgent</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 animate-fade-in delay-200">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-4">Proposal Title</div>
            <div className="col-span-2">Organizer ID</div>
            <div className="col-span-3">Updated Date/Time</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center"><span className="text-4xl">📭</span><p className="text-slate-500 mt-3 text-sm">No proposals in queue.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(p => {
                const cfg = STATUS_BADGES[p.status] || { label: p.status, cls: 'bg-slate-50 text-slate-600', dot: 'bg-slate-400' };
                return (
                  <div key={p.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition">
                    <div className="col-span-4">
                      <p className="font-semibold text-[#062E22] text-sm">{p.title}</p>
                      <p className="text-xs text-slate-400">{p.event_type}</p>
                    </div>
                    <div className="col-span-2 text-xs font-mono text-slate-500">ORG-{p.organizer_id.substring(0, 4).toUpperCase()}</div>
                    <div className="col-span-3 text-xs text-slate-500">{new Date(p.updated_at).toLocaleString()}</div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <Link href={`/admin/proposals/${p.id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium">Open</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing 1 to {Math.min(filtered.length, 5)} of {filtered.length} results</span>
            <div className="flex gap-1">
              <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-100">‹</button>
              <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-100">›</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 animate-fade-in delay-300">
          {[
            { icon: '📋', label: 'PENDING', value: pendingCount, bg: 'bg-amber-100' },
            { icon: '⏱️', label: 'AVG REVIEW TIME', value: '3.4 Days', bg: 'bg-blue-100' },
            { icon: '✅', label: 'REVIEWED TODAY', value: '8', bg: 'bg-green-100' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center text-lg`}>{s.icon}</div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-[#062E22]">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
