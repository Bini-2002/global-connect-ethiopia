'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { getOfficeLabel } from '@/app/lib/proposals';
import { ProposalRecord } from '@/app/types/proposal';

export default function PoliceProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ProposalRecord>(`/police/proposals/${id}`)
      .then(setProposal)
      .catch((err) => setError(err instanceof Error ? err.message : 'Allowed event not found'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="police" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center pt-20"><div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
        ) : !proposal ? (
          <div className="text-center pt-20 text-slate-500">{error || 'Allowed event not found.'}</div>
        ) : (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link href="/police/proposals" className="hover:text-[#062E22]">Approved Event Notifications</Link>
              <span>/</span>
              <span className="px-2 py-1 border border-slate-200 rounded text-slate-600 text-[10px] font-mono">PROP-{proposal.id.substring(0, 8).toUpperCase()}</span>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#062E22]">{proposal.title}</h1>
              <p className="text-slate-500 text-sm mt-1">Approved-event notification details for the assigned police office.</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">Event Overview</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Type</p><p className="text-sm font-medium text-slate-800">{proposal.event_type || '—'}</p></div>
                    <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Location</p><p className="text-sm font-medium text-slate-800">{proposal.location || '—'}</p></div>
                    <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Start Date</p><p className="text-sm font-medium text-slate-800">{proposal.start_date ? new Date(proposal.start_date).toLocaleDateString() : '—'}</p></div>
                    <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">End Date</p><p className="text-sm font-medium text-slate-800">{proposal.end_date ? new Date(proposal.end_date).toLocaleDateString() : '—'}</p></div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{proposal.description || 'No description provided.'}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">Police Notification</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Assigned Police Office</p>
                      <p className="text-sm font-semibold text-[#062E22]">{proposal.security_assignment?.office_name || getOfficeLabel(proposal.office_assignments?.police)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Notification Message</p>
                      <p className="text-sm text-slate-600">{proposal.security_assignment?.message || 'Notification message not available.'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Assigned At</p>
                      <p className="text-sm text-slate-600">{proposal.security_assignment?.assigned_at ? new Date(proposal.security_assignment.assigned_at).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Certificate Number</p>
                  <p className="text-lg font-bold text-green-700">{proposal.approval_certificate_number || '—'}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Routing Summary</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">Ministry</p>
                      <p className="font-semibold text-[#062E22]">{getOfficeLabel(proposal.office_assignments?.ministry)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">Municipal</p>
                      <p className="font-semibold text-[#062E22]">{getOfficeLabel(proposal.office_assignments?.municipal)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">Police</p>
                      <p className="font-semibold text-[#062E22]">{getOfficeLabel(proposal.office_assignments?.police)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
