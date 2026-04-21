"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginHeader from "@/components/loginHeader";
import api from "@/app/lib/api";

interface OrganizerVerificationStatusResponse {
  profile_type?: "organization" | "individual";
  verification_status?: string;
  status?: string;
  queue_status?: string;
}

export default function OrganizerUnderReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileType, setProfileType] = useState<"organization" | "individual" | null>(null);
  const [queueStatus, setQueueStatus] = useState("");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await api.get<OrganizerVerificationStatusResponse>(
          "/organizers/verification-status",
        );

        if (status.verification_status === "approved" || status.status === "approved") {
          router.replace("/organizer/dashboard");
          return;
        }

        if (status.verification_status !== "pending_for_review") {
          router.replace("/organizer/register");
          return;
        }

        setProfileType(status.profile_type || null);
        setQueueStatus(status.queue_status || "queued");
      } catch {
        router.replace("/organizer/register");
        return;
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [router]);

  if (loading) {
    return (
      <>
        <LoginHeader />
        <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28">
          <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              <p className="text-sm text-slate-500">Checking your review status...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const label = profileType === "individual" ? "individual organizer" : "organization";

  return (
    <>
      <LoginHeader />
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28">
        <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-[#8CB98820] p-6 shadow-xl sm:p-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Organizer Review In Progress
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#062E22]">
              Your {label} registration is under review.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Your submitted documents are waiting for admin validation. The organizer dashboard
              will stay locked until the admin team approves your application.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Verification Status
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-700">Pending admin review</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                OCR Queue
              </p>
              <p className="mt-2 text-sm font-semibold text-[#062E22]">{queueStatus}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#062E22]">What happens next</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>1. Admins review the registration details and uploaded documents.</p>
              <p>2. If approved, your organizer dashboard access will unlock automatically.</p>
              <p>3. If changes are needed, you will be sent back to registration to resubmit.</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
