'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';

interface Permit {
  id: string;
  proposal_id: string;
  organizer_id: string;
  permit_number: string;
  issued_at: string;
  issued_by_role: string;
  created_at: string;
}

export default function OrganizerPermitPage() {
  const params = useParams();
  const id = params.id as string;
  const [permit, setPermit] = useState<Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Permit>(`/permits/${id}`).then(setPermit).catch(() => setError('Permit not found or not yet issued.')).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#062E22]">PERMIT DETAIL</h1>
            <p className="text-slate-500 text-sm mt-1">View and verify official government documentation.</p>
          </div>

          {loading ? (
            <div className="flex justify-center pt-20"><div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
          ) : error || !permit ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <span className="text-5xl">📄</span>
              <p className="text-slate-500 mt-3 text-sm">{error || 'No permit found.'}</p>
              <p className="text-slate-400 text-xs mt-1">Permits are issued after final municipal approval.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#062E22]/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#062E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#062E22] text-xl">OFFICIAL PERMIT</p>
                    <p className="text-slate-500 text-sm">Federal Government of State Administration</p>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Department of Public Events</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    ISSUED
                  </span>
                  <p className="text-xs text-slate-400 mt-2">Permit No: <span className="font-bold text-slate-700">{permit.permit_number}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8">
                {/* Left: Event info */}
                <div className="col-span-2 space-y-6">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Event Information</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Organizer</p>
                        <p className="text-sm font-medium text-slate-800">{permit.organizer_id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Proposal ID</p>
                        <p className="text-sm font-mono text-slate-600">{permit.proposal_id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Validity */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Date of Issuance</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Issued At</p>
                        </div>
                        <p className="text-sm font-bold text-[#062E22]">{new Date(permit.issued_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Issued By</p>
                        </div>
                        <p className="text-sm font-bold text-[#062E22] capitalize">{permit.issued_by_role?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Terms and Conditions</p>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        This permit is issued subject to the provisions of the Civil Administrative Code. The holder must comply with all local safety and noise regulations during the validity period.
                      </p>
                      <ul className="space-y-1.5">
                        {[
                          'Non-transferable to other organizers or venues.',
                          'Must be displayed prominently at the event entrance.',
                          'Subject to immediate revocation if safety guidelines are breached.',
                        ].map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="text-[#062E22] mt-0.5">•</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Download */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 text-sm">📄</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Permit Document</p>
                        <p className="text-xs text-slate-400">Official Government Permit</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white text-xs font-semibold rounded-lg hover:bg-[#0a4a37] transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download Permit
                    </button>
                  </div>
                </div>

                {/* Right: Verification */}
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Verification</p>
                    <div className="border border-slate-200 rounded-xl p-4 text-center">
                      <div className="w-24 h-24 bg-slate-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Scan to Verify Authenticity</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">HASH: {permit.id.substring(0, 12).toUpperCase()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Administrative References</p>
                    <div className="space-y-2.5">
                      {[
                        { l: 'Date of Issuance', v: new Date(permit.issued_at).toLocaleDateString() },
                        { l: 'Proposal ID', v: permit.proposal_id.substring(0, 12) + '...' },
                        { l: 'Reference Code', v: 'GOV-' + permit.permit_number },
                      ].map(({ l, v }) => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="text-slate-400">{l}</span>
                          <span className="font-semibold text-slate-700">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400 italic">Electronically Signed</p>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">Office of the Regional Director</p>
                    <p className="text-[10px] font-mono text-slate-500">Digital ID: {permit.id.substring(0, 16).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-8 leading-relaxed border-t border-slate-100 pt-6">
                THIS IS A COMPUTER-GENERATED DOCUMENT AND DOES NOT REQUIRE A PHYSICAL SIGNATURE FOR VALIDITY. INFORMATION ON THIS DOCUMENT CAN BE VERIFIED THROUGH THE GOVPORTAL OFFICIAL VERIFICATION SERVICE USING THE PERMIT NUMBER OR QR CODE PROVIDED ABOVE. ANY ALTERATIONS TO THIS DOCUMENT RENDER IT NULL AND VOID.
              </p>

              {/* Footer links */}
              <div className="flex justify-center gap-6 mt-6 text-xs text-slate-500">
                <button className="hover:text-[#062E22] transition flex items-center gap-1">
                  <span>📞</span> Contact Support
                </button>
                <button className="hover:text-[#062E22] transition flex items-center gap-1">
                  <span>ℹ️</span> Permit Guidelines
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
