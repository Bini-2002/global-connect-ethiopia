/* frontend/app/organizer/proposals/[id]/permit/page.tsx */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { PermitRecord, VerificationLetterRecord } from '@/app/types/proposal';

export default function OrganizerPermitPage() {
  const params = useParams();
  const id = params.id as string;
  const [permit, setPermit] = useState<PermitRecord | null>(null);
  const [verificationLetter, setVerificationLetter] = useState<VerificationLetterRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPermit, setDownloadingPermit] = useState(false);
  const [downloadingLetter, setDownloadingLetter] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<PermitRecord>(`/permits/${id}`).catch(() => null),
      api.get<VerificationLetterRecord>(`/verification-letters/${id}`).catch(() => null),
    ])
      .then(([permitResponse, verificationLetterResponse]) => {
        setPermit(permitResponse);
        setVerificationLetter(verificationLetterResponse);
        if (!permitResponse && !verificationLetterResponse) {
          setError('Permit and verification letter are not available yet.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const downloadBlob = async (path: string, filename: string, setDownloading: (value: boolean) => void) => {
    setDownloading(true);
    try {
      const blob = await api.getBlob(path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#062E22]">Approval Documents</h1>
            <p className="text-slate-500 text-sm mt-1">
              View the municipal permit and the separate verification letter generated during final approval.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center pt-20">
              <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error || (!permit && !verificationLetter) ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <span className="text-5xl">Documents pending</span>
              <p className="text-slate-500 mt-3 text-sm">{error || 'No approval documents found.'}</p>
              <p className="text-slate-400 text-xs mt-1">Both artifacts become available after municipal approval.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {verificationLetter ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Verification Letter</p>
                      <h2 className="text-xl font-bold text-[#062E22] mt-1">{verificationLetter.reference_number}</h2>
                      <p className="text-sm text-slate-500 mt-2">
                        This PDF is separate from the permit and confirms the final municipal approval record.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(
                          `/verification-letters/${id}/download`,
                          `verification-letter-${verificationLetter.reference_number}.pdf`,
                          setDownloadingLetter
                        )
                      }
                      disabled={downloadingLetter}
                      className="px-4 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-60"
                    >
                      {downloadingLetter ? 'Downloading...' : 'Download Verification Letter'}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Organizer</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{verificationLetter.organizer_name}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Ministry Office</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{verificationLetter.ministry_office_name || 'Not set'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Municipal Office</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{verificationLetter.municipal_office_name || 'Not set'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Approved At</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{new Date(verificationLetter.approval_timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {permit ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Municipal Permit</p>
                      <h2 className="text-xl font-bold text-[#062E22] mt-1">{permit.permit_number}</h2>
                      <p className="text-sm text-slate-500 mt-2">
                        The permit remains a distinct approval artifact alongside the verification letter.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(
                          `/permits/${id}/download`,
                          `permit-${permit.permit_number}.json`,
                          setDownloadingPermit
                        )
                      }
                      disabled={downloadingPermit}
                      className="px-4 py-2 border border-[#062E22] text-[#062E22] text-sm font-semibold rounded-lg hover:bg-[#062E22] hover:text-white transition disabled:opacity-60"
                    >
                      {downloadingPermit ? 'Downloading...' : 'Download Permit'}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Issued At</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{new Date(permit.issued_at).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Issued By</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{permit.issued_by_office_name || permit.issued_by_role || 'Not set'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Organizer ID</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2">{permit.organizer_id || 'Not set'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Proposal ID</p>
                      <p className="text-sm font-semibold text-[#062E22] mt-2 break-all">{permit.proposal_id}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <Link
                href={`/organizer/proposals/${id}`}
                className="inline-flex text-sm font-semibold text-[#062E22] hover:underline"
              >
                Back to proposal
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
