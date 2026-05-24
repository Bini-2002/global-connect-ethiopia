'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Globe, Lock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { getOfficeLabel, PROPOSAL_STATUS_META } from '@/app/lib/proposals';
import { ProposalRecord } from '@/app/types/proposal';
import Image from 'next/image';

const FILTER_CONFIG: Record<string, { statuses: string[]; color: string }> = {
  all: { statuses: [], color: 'text-[#062E22]' },
  draft: { statuses: ['draft'], color: 'text-slate-600' },
  inReview: { statuses: ['submitted', 'ministry_review', 'ministry_approved', 'municipal_review'], color: 'text-blue-600' },
  approved: { statuses: ['approved'], color: 'text-green-600' },
  rejected: { statuses: ['rejected'], color: 'text-red-600' },
};

export default function OrganizerProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await api.get<ProposalRecord[]>('/proposals/');
      setProposals(response);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        setError('Session expired. Please log in again.');
        setTimeout(() => router.replace('/login'), 1500);
      } else {
        console.error('Error fetching proposals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposals');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [router]);

  const counts = {
    all: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    inReview: proposals.filter(p => ['submitted', 'ministry_review', 'ministry_approved', 'municipal_review'].includes(p.status)).length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  const filtered = proposals
    .filter(p => {
      const filterConfig = FILTER_CONFIG[activeFilter];
      const statusMatch = filterConfig.statuses.length === 0 || filterConfig.statuses.includes(p.status);
      const searchMatch = 
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        (p.event_type || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.location || '').toLowerCase().includes(query.toLowerCase());
      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
  };

  return (
    <div className="min-h-screen ">
                  <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse2.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
                  <div className="fixed bottom-6  right-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse3.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search proposals..." onSearch={setQuery} />
      <main className="md:ml-60 pt-16 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#062E22]">My Proposals</h1>
            <p className="text-slate-500 text-sm mt-1">{filtered.length} of {proposals.length} proposals</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchProposals(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#062E22] border border-[#062E22] text-sm font-semibold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/organizer/proposals/create"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              New Proposal
            </Link>
          </div>
        </div>

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => handleFilterClick('all')}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 transition ${
              activeFilter === 'all' ? 'border-[#062E22] bg-[#062E22]/5' : 'border-transparent hover:border-slate-300'
            }`}
          >
            <p className={`text-xs uppercase tracking-wide ${activeFilter === 'all' ? 'text-[#062E22]' : 'text-slate-500'}`}>All</p>
            <p className={`text-2xl font-bold mt-1 ${activeFilter === 'all' ? 'text-[#062E22]' : 'text-slate-600'}`}>{counts.all}</p>
          </button>
          <button
            onClick={() => handleFilterClick('draft')}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 transition ${
              activeFilter === 'draft' ? 'border-slate-600 bg-slate-50' : 'border-transparent hover:border-slate-300'
            }`}
          >
            <p className={`text-xs uppercase tracking-wide ${activeFilter === 'draft' ? 'text-slate-700' : 'text-slate-500'}`}>Draft</p>
            <p className={`text-2xl font-bold mt-1 ${activeFilter === 'draft' ? 'text-slate-700' : 'text-slate-600'}`}>{counts.draft}</p>
          </button>
          <button
            onClick={() => handleFilterClick('inReview')}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 transition ${
              activeFilter === 'inReview' ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:border-slate-300'
            }`}
          >
            <p className={`text-xs uppercase tracking-wide ${activeFilter === 'inReview' ? 'text-blue-700' : 'text-slate-500'}`}>In Review</p>
            <p className={`text-2xl font-bold mt-1 ${activeFilter === 'inReview' ? 'text-blue-700' : 'text-blue-600'}`}>{counts.inReview}</p>
          </button>
          <button
            onClick={() => handleFilterClick('approved')}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 transition ${
              activeFilter === 'approved' ? 'border-green-600 bg-green-50' : 'border-transparent hover:border-slate-300'
            }`}
          >
            <p className={`text-xs uppercase tracking-wide ${activeFilter === 'approved' ? 'text-green-700' : 'text-slate-500'}`}>Approved</p>
            <p className={`text-2xl font-bold mt-1 ${activeFilter === 'approved' ? 'text-green-700' : 'text-green-600'}`}>{counts.approved}</p>
          </button>
          <button
            onClick={() => handleFilterClick('rejected')}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 transition ${
              activeFilter === 'rejected' ? 'border-red-600 bg-red-50' : 'border-transparent hover:border-slate-300'
            }`}
          >
            <p className={`text-xs uppercase tracking-wide ${activeFilter === 'rejected' ? 'text-red-700' : 'text-slate-500'}`}>Rejected</p>
            <p className={`text-2xl font-bold mt-1 ${activeFilter === 'rejected' ? 'text-red-700' : 'text-red-600'}`}>{counts.rejected}</p>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => fetchProposals()}
              className="mt-2 text-sm text-[#062E22] font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Proposals Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-2">Proposal Title</div>
            <div>Type</div>
            <div>Status</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-5xl">📋</span>
              <p className="text-slate-500 text-sm mt-3">No proposals found.</p>
              {activeFilter !== 'all' ? (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="mt-4 inline-block text-sm text-[#062E22] font-semibold underline"
                >
                  Clear filter →
                </button>
              ) : (
                <Link href="/organizer/proposals/create" className="mt-4 inline-block text-sm text-[#062E22] font-semibold underline">Create your first proposal →</Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(p => {
                const cfg = PROPOSAL_STATUS_META[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={p.id} className="grid grid-cols-5 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition cursor-pointer" onClick={() => router.push(`/organizer/proposals/${p.id}`)}>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#062E22] text-sm">{p.title}</p>
                        {p.visibility === 'private' ? (
                          <Lock className="w-3 h-3 text-amber-500" />
                        ) : (
                          <Globe className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{p.location || 'No location'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {getOfficeLabel(p.office_assignments?.ministry, 'Ministry pending')} → {getOfficeLabel(p.office_assignments?.municipal, 'Municipal pending')}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">{p.event_type || '—'}</div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                      {p.approval_certificate_number && (
                        <p className="text-[11px] text-slate-500 mt-1">{p.approval_certificate_number}</p>
                      )}
                    </div>
                    <div className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'approved' && (
                          <Link
                            href={p.event_id ? `/organizer/events/${p.event_id}` : `/organizer/create-event/${p.id}`}
                            className="text-xs border border-green-200 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition font-medium"
                          >
                            {p.event_id ? 'Open Event' : 'Create Event'}
                          </Link>
                        )}
                        <Link href={`/organizer/proposals/${p.id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium">Open</Link>
                      </div>
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
