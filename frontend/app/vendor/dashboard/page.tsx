'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClipboardList, FileText } from 'lucide-react';
import Image from 'next/image';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService from '@/app/services/vendorPortalService';
import {
  VendorPortalSummary,
} from '@/app/types/marketplace';
function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return 'N/A';
  return `ETB ${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function VendorDashboardPage() {
  const [summary, setSummary] = useState<VendorPortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const summaryResponse = await vendorPortalService.getPortalSummary();
      setSummary(summaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the vendor portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

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
      <Sidebar role="vendor" />
      <DashboardHeader
        actionHref="/vendor/requests"
        actionLabel="View Requests"
      />

      <main className="pt-26 md:ml-60 p-6">
        <div className="mb-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Vendor portal</p>
               <h1 className="mt-1 text-3xl font-bold text-[#062E22]">Manage your vendor business and incoming requests.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                This dashboard is now wired to the approved vendor backend. Monitor recent request activity and move into contracts once an organizer accepts your deal.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/vendor/requests" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Open Requests
              </Link>
              <Link href="/vendor/contracts" className="rounded-xl bg-[#062E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a37]">
                Open Contracts
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border-l-4 border-[#062E22] shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Business</p>
                  <p className="mt-2 text-xl font-bold text-[#062E22]">{summary?.business_name || 'Approved vendor'}</p>
                  <p className="mt-2 text-sm text-slate-500">{summary?.business_category || 'Service provider'}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-[#062E22] shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Pending requests</p>
                  <p className="mt-2 text-2xl font-bold text-[#062E22]">{summary?.pending_requests_count ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-500">New organizer requests waiting for your response.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-[#062E22] shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Active contracts</p>
                  <p className="mt-2 text-2xl font-bold text-[#062E22]">{summary?.active_contracts_count ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-500">Contracts already signed by both parties.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0a4a37]">Recent requests</p>
                      <h3 className="mt-1 text-lg font-bold text-[#062E22] flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[#EC5B13]" />
                        Organizer activity
                      </h3>
                    </div>
                    <Link href="/vendor/requests" className="text-sm font-semibold text-[#062E22] hover:underline">
                      View all
                    </Link>
                  </div>

                  <div className="mt-5 space-y-3">
                    {summary?.recent_requests?.length ? (
                      summary.recent_requests.map((request) => (
                        <Link key={request.id} href={`/vendor/requests/${request.id}`} className="block rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50">
                          <p className="font-semibold text-[#062E22]">{request.service_title || 'Service request'}</p>
                          <p className="mt-1 text-sm text-slate-500">{request.status || 'pending'} • {formatCurrency(request.proposed_amount)}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatDate(request.created_at)}</p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        No organizer requests have reached this portal yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0a4a37]">Recent contracts</p>
                      <h3 className="mt-1 text-lg font-bold text-[#062E22] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#EC5B13]" />
                        Signature progress
                      </h3>
                    </div>
                    <Link href="/vendor/contracts" className="text-sm font-semibold text-[#062E22] hover:underline">
                      View all
                    </Link>
                  </div>

                  <div className="mt-5 space-y-3">
                    {summary?.recent_contracts?.length ? (
                      summary.recent_contracts.map((contract) => (
                        <Link key={contract.id} href={`/vendor/contracts/${contract.id}`} className="block rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50">
                          <p className="font-semibold text-[#062E22]">{contract.title || 'Service contract'}</p>
                          <p className="mt-1 text-sm text-slate-500">{contract.status || 'draft'} • {formatCurrency(contract.amount)}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatDate(contract.created_at)}</p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Contracts will appear here once an organizer converts an accepted request into an agreement.
                      </div>
                    )}
                  </div>
                </div>
               </div>
             </>
          )}
        </div>
      </main>
    </div>
  );
}
