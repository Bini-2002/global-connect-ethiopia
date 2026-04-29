"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { api } from "@/app/lib/api";
import { getOfficeLabel, PROPOSAL_STATUS_META } from "@/app/lib/proposals";
import { ProposalRecord } from "@/app/types/proposal";

const TIMELINE_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "ministry_review", label: "Ministry Review" },
  { key: "ministry_approved", label: "Ministry Approved" },
  { key: "municipal_review", label: "Municipal Review" },
  { key: "approved", label: "Final Decision" },
];

export default function MunicipalProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    api
      .get<ProposalRecord>(`/municipal/proposals/${id}`)
      .then(setProposal)
      .catch(() => setError("Not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const doAction = async (action: string, body?: Record<string, string>) => {
    setActionLoading(action);
    setError("");
    setSuccess("");
    try {
      if (action === "start_review")
        await api.post(`/municipal/proposals/${id}/start-review`);
      else if (action === "approve")
        await api.post(`/municipal/proposals/${id}/approve`);
      else if (action === "reject") {
        const formData = new FormData();
        formData.append("notes", body?.reason || "");
        await api.post(`/municipal/proposals/${id}/reject`, formData);
      }
      setSuccess("Action applied successfully.");
      const updated = await api.get<ProposalRecord>(
        `/municipal/proposals/${id}`,
      );
      setProposal(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading("");
      setShowRejectModal(false);
    }
  };

  const currentStepIndex = TIMELINE_STEPS.findIndex(
    (s) => s.key === proposal?.status,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="municipal" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !proposal ? (
          <div className="text-center pt-20 text-slate-500">
            Proposal not found.
          </div>
        ) : (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link
                href="/municipal/proposals"
                className="hover:text-[#062E22]"
              >
                Municipal Review Queue
              </Link>
              <span>/</span>
              <span className="px-2 py-1 border border-slate-200 rounded text-slate-600 text-[10px] font-mono">
                PROP-{proposal.id.substring(0, 8).toUpperCase()}
              </span>
              <span
                className={`px-2 py-1 rounded text-[10px] font-medium ${PROPOSAL_STATUS_META[proposal.status]?.cls || "bg-slate-100 text-slate-600"}`}
              >
                {PROPOSAL_STATUS_META[proposal.status]?.label ||
                  proposal.status}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h1 className="text-2xl font-bold text-[#062E22]">
                Review Proposal: {proposal.title}
              </h1>
              <div className="flex gap-2">
                {proposal.status === "ministry_approved" && (
                  <button
                    onClick={() => doAction("start_review")}
                    disabled={actionLoading === "start_review"}
                    className="px-4 py-2 border border-[#062E22] text-[#062E22] text-sm font-medium rounded-lg hover:bg-[#062E22] hover:text-white transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading === "start_review" && (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    Start Review
                  </button>
                )}
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => doAction("approve")}
                  disabled={actionLoading === "approve"}
                  className="px-4 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === "approve" && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Accept
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">
                    {proposal.title}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Type
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {proposal.event_type || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Location
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {proposal.location || "—"}
                      </p>
                    </div>
                  </div>
                  {proposal.description && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {proposal.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Program Overview
                      </p>
                      <p className="text-sm text-slate-600">
                        {proposal.program_overview || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Event Objectives
                      </p>
                      <p className="text-sm text-slate-600">
                        {proposal.event_objectives || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Start Date
                      </p>
                      <p className="text-sm font-bold text-[#062E22]">
                        {proposal.start_date
                          ? new Date(proposal.start_date).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        End Date
                      </p>
                      <p className="text-sm font-bold text-[#062E22]">
                        {proposal.end_date
                          ? new Date(proposal.end_date).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        Expected Attendees
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {proposal.expected_attendees?.toLocaleString() || "—"}
                      </p>
                    </div>
                    <div className="w-44 bg-[#062E22] rounded-xl p-4 text-white flex-shrink-0">
                      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">
                        Budget Estimate
                      </p>
                      <p className="text-2xl font-bold">
                        {proposal.budget_estimate?.toLocaleString() || "—"}
                      </p>
                      <p className="text-xs text-white/60">ETB</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Requesting Entity
                  </p>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#062E22] text-sm">
                        Organizer
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {proposal.organizer_id.substring(0, 16)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Verification</span>
                    <span className="font-semibold text-green-600">
                      ✓ Verified
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Routing
                  </p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                        Assigned Municipal Office
                      </p>
                      <p className="font-semibold text-[#062E22]">
                        {getOfficeLabel(proposal.office_assignments?.municipal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                        Police Notification Office
                      </p>
                      <p className="font-semibold text-[#062E22]">
                        {getOfficeLabel(proposal.office_assignments?.police)}
                      </p>
                    </div>
                    {proposal.approval_certificate_number && (
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                          Permit
                        </p>
                        <p className="font-semibold text-green-700">
                          {proposal.approval_certificate_number}
                        </p>
                      </div>
                    )}
                    {proposal.verification_letter_reference && (
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                          Verification Letter
                        </p>
                        <p className="font-semibold text-[#062E22]">
                          {proposal.verification_letter_reference}
                        </p>
                      </div>
                    )}
                    {proposal.police_notification_id && (
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                          Police Notification
                        </p>
                        <p className="font-semibold text-[#062E22]">
                          {proposal.police_notification_id
                            .slice(0, 8)
                            .toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {proposal.security_assignment && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Police Notification
                    </p>
                    <p className="font-semibold text-[#062E22] text-sm">
                      {proposal.security_assignment.office_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {proposal.security_assignment.message}
                    </p>
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
                    Review Timeline
                  </p>
                  <div className="space-y-3">
                    {TIMELINE_STEPS.map((step, i) => {
                      const isDone = i <= currentStepIndex;
                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDone ? "bg-[#D97706]" : "bg-slate-200"}`}
                          >
                            {isDone && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            )}
                          </div>
                          <p
                            className={`text-xs font-medium mt-0.5 ${isDone ? "text-slate-800" : "text-slate-400"}`}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <h3 className="font-bold text-[#062E22] mb-4">Reject Proposal</h3>
            <textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200 resize-none mb-4 text-slate-800"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => doAction("reject", { reason: rejectReason })}
                disabled={!rejectReason}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
