'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { ProposalRecord } from '@/app/types/proposal';

function getAssignedPoliceLabel(proposal: ProposalRecord): string {
  return proposal.security_assignment?.office_name
    || proposal.security_assignment?.city
    || proposal.office_assignments?.police?.display_label
    || proposal.office_assignments?.police?.office_name
    || 'Assigned City Police Office';
}

function getAssignedPoliceSubtitle(proposal: ProposalRecord): string {
  const city = proposal.security_assignment?.city || proposal.office_assignments?.police?.city;
  const officeName = proposal.security_assignment?.office_name || proposal.office_assignments?.police?.office_name;
  if (officeName && city) return `${officeName} • ${city}`;
  if (city) return city;
  return officeName || 'Assigned City Police Office';
}

export default function PoliceProposalsPage() {
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get<ProposalRecord[]>('/police/proposals/').then(setProposals).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = proposals.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) || (p.location || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="police" />
      <DashboardHeader searchPlaceholder="Search events..." onSearch={setQuery} />
      <main className="ml-60 pt-16 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[#062E22]">Approved Event Notifications</h1>
            <p className="text-slate-500 text-sm mt-1">Read-only notifications for approved events assigned to your police office.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {filtered.length} Assigned Events
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in delay-100">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-4">Event Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Event Dates</div>
            <div className="col-span-1">Certificate</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-5xl">🛡️</span>
              <p className="text-slate-500 mt-3 text-sm">No approved event notifications found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(p => (
                <div key={p.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition">
                  <div className="col-span-4">
                    <p className="font-semibold text-[#062E22] text-sm">{p.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{getAssignedPoliceLabel(p)}</p>
                    <p className="text-xs font-mono text-slate-400">ORG-{p.organizer_id.substring(0, 4).toUpperCase()}</p>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">{p.event_type || '—'}</div>
                  <div className="col-span-2 text-xs text-slate-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    {p.location || '—'}
                  </div>
                  <div className="col-span-2 text-xs text-slate-500">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'}
                    {p.end_date ? ` → ${new Date(p.end_date).toLocaleDateString()}` : ''}
                  </div>
                  <div className="col-span-1 text-xs text-slate-500">{p.approval_certificate_number || '—'}</div>
                  <div className="col-span-1 flex justify-end">
                    <Link href={`/police/proposals/${p.id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
