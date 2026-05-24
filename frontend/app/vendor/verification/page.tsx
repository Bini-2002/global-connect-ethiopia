"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import LoginHeader from "@/components/loginHeader";
import api from "@/app/lib/api";
import { logout } from "@/app/lib/auth";

interface VendorVerificationStatusResponse {
  status?: string;
  verification_status?: string;
  queue_status?: string;
}

export default function VendorVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState("queued");
  const [statusLabel, setStatusLabel] = useState("Waiting for review");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await api.get<VendorVerificationStatusResponse>(
          "/vendors/verification/status",
        );

        if (status.verification_status === "approved" || status.status === "approved") {
          router.replace("/vendor/dashboard");
          return;
        }

        setQueueStatus(status.queue_status || "queued");
        setStatusLabel(
          status.verification_status === "rejected"
            ? "Application needs updates"
            : status.verification_status === "not_started"
              ? "Waiting to submit"
              : "Waiting for review",
        );
      } catch {
        setQueueStatus("unavailable");
        setStatusLabel("Waiting for review");
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [router]);

  const handleSignOut = () => {
    logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <>
        <LoginHeader />
        <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28">
          <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              <p className="text-sm text-slate-500">Checking your verification status...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <LoginHeader />
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28">
        <div className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-[#8CB98820] p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Vendor Waiting Dashboard
              </p>
              <h1 className="mt-2 text-2xl font-bold text-[#062E22]">
                {statusLabel}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Your vendor application is being reviewed. Please stay on this page while the team
                validates your business documents and verification details.
              </p>
            </section>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:mt-1"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Verification Status
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-700">{statusLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Queue Status
              </p>
              <p className="mt-2 text-sm font-semibold text-[#062E22]">{queueStatus}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#062E22]">What happens next</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>1. The review team checks your submitted business information and documents.</p>
              <p>2. If approved, you will be redirected automatically to the vendor dashboard.</p>
              <p>3. If updates are needed, you will be asked to revise and resubmit your details.</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
