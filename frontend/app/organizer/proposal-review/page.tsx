"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import Link from "next/link";
import { api } from "@/app/lib/api";
import { getOrganizerPortalRoute } from "@/app/lib/auth";
import {
  appendProposalFields,
  base64ToFile,
  findReviewTargetById,
  getOfficeLabel,
  isPersistedProposal,
  normalizeSessionProposalData,
} from "@/app/lib/proposals";
import { Calendar, MapPin, Users, DollarSign, Shield, FileText, CheckCircle, Clock, AlertCircle, ArrowLeft, Send } from "lucide-react";
import { ProposalRecord, ReviewTargetsResponse, SessionProposalData } from "@/app/types/proposal";
import Image from "next/image";

export default function ProposalReview() {
  const router = useRouter();
  const [proposal, setProposal] = useState<SessionProposalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewTargets, setReviewTargets] = useState<ReviewTargetsResponse>({
    ministry: [],
    municipal: [],
    police: [],
  });

  useEffect(() => {
    let isActive = true;

    const loadReviewTargets = async () => {
      try {
        const organizerRoute = await getOrganizerPortalRoute();
        if (!isActive) {
          return;
        }

        if (organizerRoute !== "/organizer/dashboard") {
          router.replace(organizerRoute);
          return;
        }

        const data = await api.get<ReviewTargetsResponse>('/offices/review-targets');
        if (isActive) {
          setReviewTargets(data);
        }
      } catch (err) {
        if (!isActive) {
          return;
        }

        if (err instanceof Error && err.message === "Not authenticated") {
          router.replace('/login');
          return;
        }

        if (isActive) {
          console.error('Error loading review offices:', err);
        }
      }
    };

    void loadReviewTargets();

    const savedData = localStorage.getItem('pendingProposal');
    if (savedData) {
      setProposal(normalizeSessionProposalData(JSON.parse(savedData)));
    }

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleEdit = () => {
    if (proposal) {
      localStorage.setItem('pendingProposal', JSON.stringify(proposal));
    }
    router.push('/organizer/proposals/create');
  };

  const handleSaveDraft = async () => {
    if (!proposal) return;

    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      appendProposalFields(formDataToSend, proposal);

      if (proposal.document_base64 && proposal.document_name) {
        const mimeType = proposal.document_name.endsWith('.pdf') ? 'application/pdf' : 'application/zip';
        const file = base64ToFile(proposal.document_base64, proposal.document_name, mimeType);
        formDataToSend.append('document', file);
      }

      const saved = isPersistedProposal(proposal.id)
        ? await api.patch<ProposalRecord>(`/proposals/${proposal.id}`, formDataToSend)
        : await api.post<ProposalRecord>('/proposals/', formDataToSend);

      localStorage.removeItem('pendingProposal');
      setProposal({
        ...proposal,
        id: saved.id,
      });
      router.push('/organizer/proposals');
    } catch (error) {
      if (error instanceof Error && error.message === "Not authenticated") {
        router.replace('/login');
        return;
      }

      console.error('Error saving draft:', error);
      setError(error instanceof Error ? error.message : 'Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!proposal) return;

    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      appendProposalFields(formDataToSend, proposal);

      if (proposal.document_base64 && proposal.document_name) {
        const mimeType = proposal.document_name.endsWith('.pdf') ? 'application/pdf' : 'application/zip';
        const file = base64ToFile(proposal.document_base64, proposal.document_name, mimeType);
        formDataToSend.append('document', file);
      }

      const savedProposal = isPersistedProposal(proposal.id)
        ? await api.patch<ProposalRecord>(`/proposals/${proposal.id}`, formDataToSend)
        : await api.post<ProposalRecord>('/proposals/', formDataToSend);

      await api.post<ProposalRecord>(`/proposals/${savedProposal.id}/submit`);

      localStorage.removeItem('pendingProposal');
      setShowSuccess(true);

      setTimeout(() => {
        router.push('/organizer/proposals');
      }, 2000);
    } catch (error) {
      if (error instanceof Error && error.message === "Not authenticated") {
        router.replace('/login');
        return;
      }

      console.error('Error submitting proposal:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const ministryOffice = proposal
    ? findReviewTargetById(reviewTargets.ministry, proposal.ministryOfficeId)
    : undefined;
  const municipalOffice = proposal
    ? findReviewTargetById(reviewTargets.municipal, proposal.municipalOfficeId)
    : undefined;
  const policeOffice = proposal
    ? findReviewTargetById(reviewTargets.police, proposal.policeOfficeId)
    : undefined;

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen ">

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#062E22] mb-2">Proposal Submitted!</h2>
          <p className="text-gray-600 mb-6">Your event proposal has been successfully submitted for ministry review.</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 mt-4">Redirecting to My Events...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#062E22] mb-2">No Proposal Data</h2>
          <p className="text-gray-600 mb-6">Please create a proposal first to view the review page.</p>
          <Link
            href="/organizer/proposals/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#062E22] text-white rounded-lg hover:bg-green-800 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Create Proposal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search proposals..." />
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
      <div className="md:ml-60 pt-16 p-6 md:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#062E22]">Review Proposal</h1>
            <p className="text-gray-500 mt-1">Review your event proposal before submitting</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleEdit}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-[#062E22] font-medium text-sm transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="px-4 py-2.5 border border-[#CBD5E1] rounded-lg hover:bg-gray-100 text-[#062E22] font-medium text-sm transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-[#062E22] text-white rounded-lg hover:bg-green-800 font-semibold text-sm transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit for Review
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 border border-gray-100">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                <div className="p-2 bg-[#062E22]/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#062E22]" />
                </div>
                <h2 className="text-xl font-bold text-[#062E22]">Event Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-[#062E22]">{proposal.title || 'Untitled Event'}</h3>
                  <p className="text-gray-600 mt-1">{proposal.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Event Type</p>
                      <p className="font-semibold text-[#062E22]">{proposal.event_type || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Expected Attendees</p>
                      <p className="font-semibold text-[#062E22]">{proposal.expected_attendees || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="font-semibold text-[#062E22]">{formatDate(proposal.start_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="font-semibold text-[#062E22]">{formatDate(proposal.end_date)}</p>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-semibold text-[#062E22]">{proposal.location || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 border border-gray-100">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                <div className="p-2 bg-[#EC5B13]/10 rounded-lg">
                  <FileText className="w-5 h-5 text-[#EC5B13]" />
                </div>
                <h2 className="text-xl font-bold text-[#062E22]">Program Details</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Program Overview</h3>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                    {proposal.programOverview || 'No program overview provided'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Event Objectives</h3>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                    {proposal.eventObjectives || 'No objectives provided'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Target Audience</h3>
                  <div className="flex flex-wrap gap-2">
                    {proposal.targetAudience && proposal.targetAudience.length > 0 ? (
                      proposal.targetAudience.map((audience, idx) => (
                        <span
                          key={idx}
                          className="bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200 font-medium"
                        >
                          {audience}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No target audience specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 flex-1 border border-gray-100">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#062E22]">Budget</h2>
                </div>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-1">Estimated Total Budget</p>
                  <p className="text-3xl font-bold text-[#062E22]">{formatBudget(proposal.budget_estimate || 0)}</p>
                </div>
              </div>

              <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 flex-1 border border-gray-100">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#062E22]">Security Plan</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Security Level</p>
                    <p className="font-semibold text-[#062E22]">{proposal.securityLevel || 'Standard (Private Security)'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Personnel Count</p>
                    <p className="font-semibold text-[#062E22]">{proposal.personnelCount || 0} personnel</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 border border-gray-100">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                <div className="p-2 bg-[#062E22]/10 rounded-lg">
                  <Shield className="w-5 h-5 text-[#062E22]" />
                </div>
                <h2 className="text-xl font-bold text-[#062E22]">Approval Routing & Police Notification</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Ministry Office',
                    value: getOfficeLabel(ministryOffice, proposal.ministryOfficeId || 'Not selected'),
                    subtext: ministryOffice?.email || ministryOffice?.office_name || 'Review starts here',
                  },
                  {
                    label: 'Municipal Office',
                    value: getOfficeLabel(municipalOffice, proposal.municipalOfficeId || 'Not selected'),
                    subtext: municipalOffice?.email || municipalOffice?.office_name || 'Receives after ministry approval',
                  },
                  {
                    label: 'Police Notification Office',
                    value: getOfficeLabel(policeOffice, proposal.policeOfficeId || 'Not selected'),
                    subtext: policeOffice?.email || policeOffice?.office_name || 'Receives approved-event information after municipal approval',
                  },
                ].map((office) => (
                  <div key={office.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{office.label}</p>
                    <p className="font-semibold text-[#062E22]">{office.value}</p>
                    <p className="text-xs text-slate-500 mt-2">{office.subtext}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 border border-gray-100">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-[#062E22]">Document Upload</h2>
              </div>
              {proposal.document_name ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                  <FileText className="w-8 h-8 text-[#062E22] mx-auto mb-2" />
                  <p className="font-medium text-[#062E22]">{proposal.document_name}</p>
                  {proposal.document_size && (
                    <p className="text-sm text-gray-500 mt-1">
                      {(proposal.document_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <p className="text-gray-500">No documents uploaded</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-80 xl:w-96 space-y-6 flex-shrink-0">
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-[#062E22] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Review Progress
              </h2>
              <div className="flex flex-col gap-4">
                {[ 
                  { label: "Draft Stage", desc: "Proposal prepared by organizer", completed: true, active: false },
                  {
                    label: "Ministry Review",
                    desc: getOfficeLabel(ministryOffice, 'Pending ministry assignment'),
                    completed: false,
                    active: true,
                  },
                  {
                    label: "Municipal Review",
                    desc: getOfficeLabel(municipalOffice, 'Pending municipal assignment'),
                    completed: false,
                    active: false,
                  },
                  {
                    label: "Police Notification",
                    desc: getOfficeLabel(policeOffice, 'Pending police notification office'),
                    completed: false,
                    active: false,
                  },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step.completed ? "bg-[#062E22]" : step.active ? "bg-[#EC5B13] animate-pulse" : "bg-gray-300"
                      }`}>
                        {step.completed && <CheckCircle className="w-4 h-4 text-white" />}
                        {step.active && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      {idx < 3 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`font-semibold ${step.completed ? "text-[#062E22]" : step.active ? "text-[#EC5B13]" : "text-gray-700"}`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-[#062E22] mb-4">Help & Resources</h2>
              <div className="space-y-3">
                <Link href="/read" className="flex items-center gap-2 text-[#EC5B13] font-medium hover:underline">
                  <FileText className="w-4 h-4" />
                  Licensing Regulations
                </Link>
                <a href="/sample-proposal-template.pdf" download className="flex items-center gap-2 text-gray-600 hover:text-[#062E22] transition-colors">
                  <FileText className="w-4 h-4" />
                  Sample Proposal Template
                </a>
              </div>
            </div>

            <div className="p-6 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, #35554C 0%, #010C27 70%, #EC5B13 100%)" }}>
              <h2 className="text-lg font-bold text-white mb-4">Important Notes</h2>
              <ul className="space-y-3 text-white/90 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#EC5B13]">•</span>
                  All events must be submitted at least 21 business days before the event date.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#EC5B13]">•</span>
                  Noise permits must be obtained separately from the Environmental Bureau.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#EC5B13]">•</span>
                  Foreign performers require additional visa clearances.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
