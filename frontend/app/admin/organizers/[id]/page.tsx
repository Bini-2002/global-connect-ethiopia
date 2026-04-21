'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { getRole, getToken } from '@/app/lib/auth';

interface OrganizerDetail {
  id: string;
  user_id: string;
  profile_type?: string;
  full_name?: string;
  organization_name?: string;
  status: string;
  verification_status?: string;
  ocr_score?: number;
  ocr_tier?: string;
  recommendation?: string;
  recommended_status?: string;
  phone?: string;
  email?: string;
  national_id_number?: string;
  created_at: string;
}

interface AdminDocumentItem {
  owner_type: string;
  entity_id: string;
  document_key: string;
  filename?: string;
  content_type?: string;
  storage_provider?: string;
  document_url?: string;
  uploaded_at?: string;
  download_endpoint: string;
}

interface AdminDocumentListResponse {
  count: number;
  items: AdminDocumentItem[];
}

const DOCUMENT_LABELS: Record<string, string> = {
  business_licence: 'Business licence / registration document',
  representative_id_document: 'Representative ID / passport',
  authorization_proof: 'Authorization proof letter',
  national_id: 'National ID / passport',
  government_issued_id: 'Government-issued ID',
};

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_ONLY_FORMATTER.format(date);
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_TIME_FORMATTER.format(date);
}

export default function AdminOrganizerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [org, setOrg] = useState<OrganizerDetail | null>(null);
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [docsLoading, setDocsLoading] = useState(true);
  const [documentLoadingKey, setDocumentLoadingKey] = useState('');
  const [error, setError] = useState('');
  const [docsError, setDocsError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || (role !== 'admin' && role !== 'super_admin')) {
      setLoading(false);
      setDocsLoading(false);
      router.replace('/login');
      return;
    }

    api.get<OrganizerDetail>(`/admin/organizers/${id}`)
      .then(setOrg)
      .catch((err) => {
        if (err instanceof Error && err.message === 'Not authenticated') {
          router.replace('/login');
          return;
        }
        setError('Not found');
      })
      .finally(() => setLoading(false));

    api.get<AdminDocumentListResponse>(`/admin/documents?owner_type=organizer&entity_id=${id}`)
      .then((docs) => {
        setDocuments(docs.items || []);
        setDocsError('');
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'Not authenticated') {
          router.replace('/login');
          return;
        }
        setDocsError(err instanceof Error ? err.message : 'Failed to load documents');
      })
      .finally(() => setDocsLoading(false));
  }, [id, router]);

  const doDecision = async (decision: 'approved' | 'rejected') => {
    setActionLoading(decision); setError(''); setSuccess('');
    try {
      const form = new FormData();
      if (notes.trim()) {
        form.append('notes', notes.trim());
      }

      await api.patch(
        `/admin/organizers/${id}/decision?approved=${decision === 'approved'}`,
        form,
      );
      setSuccess(`Organizer ${decision} successfully.`);
      const updated = await api.get<OrganizerDetail>(`/admin/organizers/${id}`);
      setOrg(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally { setActionLoading(''); }
  };

  const rerunOCR = async () => {
    setActionLoading('ocr'); setError(''); setSuccess('');
    try {
      await api.post(`/admin/organizers/run-ocr/${id}`);
      setSuccess('OCR completed successfully. Refreshing organizer review data...');

      const updated = await api.get<OrganizerDetail>(`/admin/organizers/${id}`);
      setOrg(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed');
    } finally { setActionLoading(''); }
  };

  const openDocument = async (doc: AdminDocumentItem) => {
    const token = getToken();
    if (!token) {
      setDocsError('Your session expired. Please log in again.');
      return;
    }

    setDocsError('');
    setDocumentLoadingKey(doc.document_key);

    try {
      const response = await fetch(api.resolveUrl(doc.download_endpoint), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to access document (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const responseContentType = response.headers.get('Content-Type') || '';
      const fileName = (doc.filename || '').toLowerCase();
      const isInlineViewable =
        responseContentType.includes('pdf') ||
        responseContentType.startsWith('image/') ||
        fileName.endsWith('.pdf') ||
        fileName.endsWith('.png') ||
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.webp') ||
        fileName.endsWith('.gif');

      if (isInlineViewable) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = doc.filename || 'document';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      }
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Failed to open document');
    } finally {
      setDocumentLoadingKey('');
    }
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
        ) : !org ? (
          <div className="text-center pt-20"><p className="text-slate-500">Application not found.</p></div>
        ) : (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link href="/admin/organizers" className="hover:text-[#062E22]">Organizer Queue</Link>
              <span>/</span>
              <span className="text-slate-600">{org.full_name || org.organization_name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h1 className="text-2xl font-bold text-[#062E22]">{org.full_name || org.organization_name}</h1>
              {org.verification_status === 'pending_for_review' && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={rerunOCR} disabled={!!actionLoading}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-2">
                    {actionLoading === 'ocr' && <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
                    Re-run OCR
                  </button>
                  <button onClick={() => doDecision('rejected')} disabled={!!actionLoading}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-2">
                    {actionLoading === 'rejected' && <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />}
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
                {/* Profile */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-[#062E22] mb-4 text-sm uppercase tracking-wide">Profile Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      { l: 'Type', v: org.profile_type || '—' },
                      { l: 'Name', v: org.full_name || org.organization_name || '—' },
                      { l: 'Email', v: org.email || '—' },
                      { l: 'Phone', v: org.phone || '—' },
                      { l: 'National ID', v: org.national_id_number || '—' },
                      { l: 'Applied At', v: formatDate(org.created_at) },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{l}</p>
                        <p className="font-medium text-slate-800">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="font-semibold text-[#062E22] text-sm uppercase tracking-wide">
                      Submitted Documents
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      {docsLoading ? 'Loading...' : `${documents.length} file(s)`}
                    </span>
                  </div>

                  {docsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-[#062E22] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : docsError ? (
                    <p className="text-sm text-red-600">{docsError}</p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No submitted documents were found for this organizer yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.document_key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800">
                              {DOCUMENT_LABELS[doc.document_key] || doc.document_key}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 break-all">
                              {doc.filename || 'Unnamed file'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {doc.storage_provider || 'unknown'} {doc.uploaded_at ? `• ${formatDateTime(doc.uploaded_at)}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openDocument(doc)}
                            disabled={documentLoadingKey === doc.document_key}
                            className="shrink-0 rounded-lg border border-[#062E22] px-3 py-2 text-xs font-semibold text-[#062E22] transition hover:bg-[#062E22] hover:text-white"
                          >
                            {documentLoadingKey === doc.document_key ? 'Opening...' : 'Open'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-[#062E22] mb-3 text-sm uppercase tracking-wide">Admin Notes</h3>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes for this decision..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] resize-none text-slate-800" />
                </div>
              </div>

              {/* OCR Sidebar */}
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">OCR Verification</p>
                  <div className="text-center mb-4">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#062E22" strokeWidth="3"
                          strokeDasharray={`${org.ocr_score || 0}, 100`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[#062E22]">{org.ocr_score ?? '—'}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTier(org.ocr_score).cls}`}>{getTier(org.ocr_score).label}</span>
                  </div>
                  {org.recommendation && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">OCR Recommendation</p>
                      <p className="text-xs text-slate-700 capitalize">{org.recommendation.replaceAll('_', ' ')}</p>
                      {org.recommended_status && (
                        <p className="text-xs text-slate-500 mt-1">
                          Suggested outcome: {org.recommended_status.replaceAll('_', ' ')}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        OCR is advisory only. Final approval stays with admin review.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${org.verification_status === 'approved' ? 'bg-green-100 text-green-700' : org.verification_status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                    {org.verification_status || org.status}
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
