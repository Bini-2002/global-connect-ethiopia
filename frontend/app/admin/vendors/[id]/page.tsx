'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';

interface VendorDetail {
  id: string;
  user_id: string;
  business_name?: string;
  business_category?: string;
  business_address?: string;
  registration_number?: string;
  years_of_operation?: number;
  website_url?: string;
  status: string;
  ocr_score?: number;
  ocr_tier?: string;
  recommendation?: string;
  created_at: string;
}

export default function AdminVendorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get<VendorDetail>(`/admin/vendors/${id}`).then(setVendor).catch(() => setError('Not found')).finally(() => setLoading(false));
  }, [id]);

  const doDecision = async (decision: 'approved' | 'rejected') => {
    setActionLoading(decision); setError(''); setSuccess('');
    try {
      await api.patch(`/admin/vendors/${id}/decision`, { decision, notes });
      setSuccess(`Vendor ${decision} successfully.`);
      const updated = await api.get<VendorDetail>(`/admin/vendors/${id}`);
      setVendor(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally { setActionLoading(''); }
  };

  const rerunOCR = async () => {
    setActionLoading('ocr'); setError(''); setSuccess('');
    try {
      await api.post(`/admin/vendors/run-ocr/${id}`);
      setSuccess('OCR job queued successfully. Refresh to see updated scores.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed');
    } finally { setActionLoading(''); }
  };

  const getTier = (score?: number) => {
    if (!score) return { label: 'Pending', cls: 'bg-slate-100 text-slate-500' };
    if (score >= 80) return { label: '🥇 Gold', cls: 'bg-amber-100 text-amber-700' };
    if (score >= 60) return { label: '🥈 Silver', cls: 'bg-slate-200 text-slate-600' };
    return { label: '🥉 Bronze', cls: 'bg-orange-100 text-orange-600' };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center pt-20"><div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
        ) : !vendor ? (
          <div className="text-center pt-20"><p className="text-slate-500">Application not found.</p></div>
        ) : (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link href="/admin/vendors" className="hover:text-[#062E22]">Vendor Queue</Link>
              <span>/</span>
              <span className="text-slate-600">{vendor.business_name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h1 className="text-2xl font-bold text-[#062E22]">{vendor.business_name || 'Vendor Application'}</h1>
              {vendor.status === 'pending_review' && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={rerunOCR} disabled={!!actionLoading}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-2">
                    {actionLoading === 'ocr' && <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
                    Re-run OCR
                  </button>
                  <button onClick={() => doDecision('rejected')} disabled={!!actionLoading}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                    Reject
                  </button>
                  <button onClick={() => doDecision('approved')} disabled={!!actionLoading}
                    className="px-4 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center gap-2">
                    {actionLoading === 'approved' && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Approve
                  </button>
                </div>
              )}
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-[#062E22] mb-4 text-sm uppercase tracking-wide">Business Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      { l: 'Business Name', v: vendor.business_name || '—' },
                      { l: 'Category', v: vendor.business_category || '—' },
                      { l: 'Address', v: vendor.business_address || '—' },
                      { l: 'Registration No.', v: vendor.registration_number || '—' },
                      { l: 'Years of Operation', v: vendor.years_of_operation?.toString() || '—' },
                      { l: 'Website', v: vendor.website_url || '—' },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{l}</p>
                        <p className="font-medium text-slate-800 break-words">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-[#062E22] mb-3 text-sm uppercase tracking-wide">Admin Notes</h3>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes for this decision..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] resize-none text-slate-800" />
                </div>
              </div>
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">OCR Verification</p>
                  <div className="text-center mb-4">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#062E22" strokeWidth="3"
                          strokeDasharray={`${vendor.ocr_score || 0}, 100`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[#062E22]">{vendor.ocr_score ?? '—'}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTier(vendor.ocr_score).cls}`}>{getTier(vendor.ocr_score).label}</span>
                  </div>
                  {vendor.recommendation && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Recommendation</p>
                      <p className="text-xs text-slate-700 capitalize">{vendor.recommendation}</p>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Current Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${vendor.status === 'approved' ? 'bg-green-100 text-green-700' : vendor.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                    {vendor.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
