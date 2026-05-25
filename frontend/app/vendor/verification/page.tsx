"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Upload, ChevronRight, CheckCircle2 } from "lucide-react";
import LoginHeader from "@/components/loginHeader";
import api from "@/app/lib/api";
import { logout, getToken } from "@/app/lib/auth";

interface VendorVerificationStatusResponse {
  status?: string;
  verification_status?: string;
  queue_status?: string;
}

// ─── Waitlist / Under-Review screen ───────────────────────────────────────────
function WaitlistScreen({ statusLabel, queueStatus, onSignOut }: { statusLabel: string; queueStatus: string; onSignOut: () => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-[#8CB98820] p-6 shadow-xl sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Vendor Application</p>
          <h1 className="mt-2 text-2xl font-bold text-[#062E22]">{statusLabel}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Your vendor application is being reviewed. The team will validate your business documents and verification details.
          </p>
        </section>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:mt-1"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification Status</p>
          <p className="mt-2 text-sm font-semibold text-amber-700">{statusLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue Status</p>
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
  );
}

// ─── Registration Form ─────────────────────────────────────────────────────────
const CATEGORIES = ["Catering", "Audio/Visual", "Decoration", "Photography", "Security", "Transportation", "Hotel", "Entertainment", "Printing", "IT Services", "Other"];

function RegistrationForm({ onSubmitted, onSignOut }: { onSubmitted: () => void; onSignOut: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 2 fields
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [yearsOfOperation, setYearsOfOperation] = useState("0");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [govId, setGovId] = useState<File | null>(null);

  // Step 3 fields
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessDoc || !govId) {
      setError("Please upload both required documents.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAccurate || !agreeTerms) {
      setError("You must confirm both declarations before submitting.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const token = getToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

      // Step 2: upload business details + documents
      const formData = new FormData();
      formData.append("business_name", businessName);
      formData.append("business_category", businessCategory);
      formData.append("business_address", businessAddress);
      if (registrationNumber) formData.append("registration_number", registrationNumber);
      formData.append("years_of_operation", yearsOfOperation);
      if (websiteUrl) formData.append("website_url", websiteUrl);
      formData.append("business_license_or_registration_certificate", businessDoc!);
      formData.append("government_issued_id", govId!);

      const step2Res = await fetch(`${apiBase}/vendors/verification/step-2`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });
      if (!step2Res.ok) {
        const data = await step2Res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to upload business details.");
      }

      // Step 3: final submission
      const step3Data = new FormData();
      step3Data.append("confirm_information_is_accurate", "true");
      step3Data.append("agree_terms_and_privacy", "true");

      const step3Res = await fetch(`${apiBase}/vendors/verification/step-3/submit`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: step3Data,
      });
      if (!step3Res.ok) {
        const data = await step3Res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to submit application.");
      }

      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ["Business Details", "Confirm & Submit"];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Vendor Registration</p>
          <h1 className="mt-1 text-2xl font-bold text-[#062E22]">Submit Your Application</h1>
          <p className="mt-1 text-sm text-slate-500">Complete the steps below to apply for vendor approval.</p>
        </div>
        <button onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, i) => {
          const idx = i + 1;
          const active = step === idx;
          const done = step > idx;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${done ? "bg-emerald-500 text-white" : active ? "bg-[#062E22] text-white" : "bg-slate-200 text-slate-500"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : idx}
              </div>
              <span className={`text-sm font-medium ${active ? "text-[#062E22]" : "text-slate-400"}`}>{label}</span>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Step 1: Business details ── */}
      {step === 1 && (
        <form onSubmit={handleStep2Submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Business Name *</label>
              <input required value={businessName} onChange={e => setBusinessName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#062E22]" placeholder="e.g. Sunrise Catering" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Business Category *</label>
              <select required value={businessCategory} onChange={e => setBusinessCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#062E22] bg-white">
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Business Address *</label>
              <input required value={businessAddress} onChange={e => setBusinessAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#062E22]" placeholder="e.g. Bole, Addis Ababa" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Registration Number</label>
              <input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#062E22]" placeholder="Optional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Years in Operation *</label>
              <input required type="number" min="0" value={yearsOfOperation} onChange={e => setYearsOfOperation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#062E22]" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Website URL</label>
              <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#062E22]" placeholder="https://yoursite.com (optional)" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Business License / Certificate *</label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition ${businessDoc ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-[#062E22]"}`}>
                <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{businessDoc ? businessDoc.name : "Click to upload"}</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG — max 10 MB</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setBusinessDoc(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Government-Issued ID *</label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition ${govId ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-[#062E22]"}`}>
                <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{govId ? govId.name : "Click to upload"}</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG — max 10 MB</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setGovId(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>

          <button type="submit" className="w-full rounded-xl bg-[#062E22] py-3 text-sm font-semibold text-white shadow hover:bg-[#0a4a37] transition">
            Continue to Review →
          </button>
        </form>
      )}

      {/* ── Step 2: Confirm & Submit ── */}
      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#062E22]">Review & Confirm</h2>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Business Name</span><span className="font-medium text-slate-800">{businessName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium text-slate-800">{businessCategory}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium text-slate-800">{businessAddress}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Years Active</span><span className="font-medium text-slate-800">{yearsOfOperation}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Business Doc</span><span className="font-medium text-emerald-700">{businessDoc?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Gov. ID</span><span className="font-medium text-emerald-700">{govId?.name}</span></div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={confirmAccurate} onChange={e => setConfirmAccurate(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#062E22]" />
              <span className="text-sm text-slate-700">I confirm that all information provided is accurate and truthful to the best of my knowledge.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#062E22]" />
              <span className="text-sm text-slate-700">I agree to Global Connect Ethiopia's Terms of Service and Privacy Policy.</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              ← Back
            </button>
            <button type="submit" disabled={isSubmitting || !confirmAccurate || !agreeTerms}
              className="flex-1 rounded-xl bg-[#062E22] py-3 text-sm font-semibold text-white shadow hover:bg-[#0a4a37] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {isSubmitting ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function VendorVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string>("not_started");
  const [queueStatus, setQueueStatus] = useState("queued");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await api.get<VendorVerificationStatusResponse>("/vendors/verification/status");

        if (status.verification_status === "approved" || status.status === "approved") {
          router.replace("/vendor/dashboard");
          return;
        }

        setVerificationStatus(status.verification_status || status.status || "not_started");
        setQueueStatus(status.queue_status || "queued");
      } catch {
        setVerificationStatus("not_started");
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

  const handleSubmitted = () => {
    setSubmitted(true);
    setVerificationStatus("pending_for_review");
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

  const isNewVendor = verificationStatus === "not_started" || verificationStatus === "draft";

  const statusLabel =
    submitted
      ? "Application submitted! Waiting for review."
      : verificationStatus === "rejected"
      ? "Application needs updates"
      : verificationStatus === "pending_for_review"
      ? "Under review"
      : "Waiting for review";

  return (
    <>
      <LoginHeader />
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28">
        {isNewVendor && !submitted ? (
          <RegistrationForm onSubmitted={handleSubmitted} onSignOut={handleSignOut} />
        ) : (
          <WaitlistScreen statusLabel={statusLabel} queueStatus={queueStatus} onSignOut={handleSignOut} />
        )}
      </main>
    </>
  );
}
