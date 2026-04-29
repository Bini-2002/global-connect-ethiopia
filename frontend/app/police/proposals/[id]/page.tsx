"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { api } from "@/app/lib/api";
import { PoliceNotificationRecord } from "@/app/types/proposal";

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function PoliceProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [notification, setNotification] =
    useState<PoliceNotificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<PoliceNotificationRecord>(`/police/proposals/${id}`)
      .then(setNotification)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Allowed event not found",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="police" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !notification ? (
          <div className="text-center pt-20 text-slate-500">
            {error || "Allowed event not found."}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link href="/police/proposals" className="hover:text-[#062E22]">
                Police Notifications
              </Link>
              <span>/</span>
              <span className="px-2 py-1 border border-slate-200 rounded text-slate-600 text-[10px] font-mono">
                POL-{notification.id.substring(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#062E22]">
                {notification.event_title}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Persisted security-notification details for the assigned police
                office.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">
                    Security Context
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Location
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.location || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Expected Attendees
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.expected_attendees?.toLocaleString() ||
                          "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Start Date
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(notification.start_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        End Date
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(notification.end_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Security Level
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.security_level || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Personnel Count
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.personnel_count || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">
                    Organizer Contact
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Organizer
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.organizer_contact.organizer_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Email
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.organizer_contact.email || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Phone
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.organizer_contact.phone || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Alternative Contact
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {notification.organizer_contact.alternative_contact ||
                          "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">
                    Security Plan Artifact
                  </h2>
                  {notification.security_plan_document?.document_url ? (
                    <a
                      href={notification.security_plan_document.document_url}
                      target="_blank"
                      className="inline-flex px-4 py-2 bg-[#062E22] text-white rounded-lg text-sm font-semibold hover:bg-[#0a4a37] transition"
                    >
                      Open Security Plan
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No uploaded security plan document is linked to this
                      notification.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Police Office
                  </p>
                  <p className="font-semibold text-[#062E22] text-sm">
                    {notification.police_office.office_name ||
                      "Assigned Police Office"}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {notification.police_office.city ||
                      notification.police_office.display_label ||
                      "—"}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Approval References
                  </p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                        Permit
                      </p>
                      <p className="font-semibold text-[#062E22]">
                        {notification.permit_reference || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                        Verification Letter
                      </p>
                      <p className="font-semibold text-[#062E22]">
                        {notification.approval_reference || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                        Municipal Office
                      </p>
                      <p className="font-semibold text-[#062E22]">
                        {notification.municipal_office_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest">
                        Notified At
                      </p>
                      <p className="font-semibold text-[#062E22]">
                        {formatDate(notification.notified_at)}
                      </p>
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
