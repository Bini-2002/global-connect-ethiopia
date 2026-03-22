"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginHeader from "@/components/loginHeader";
import api from "@/app/lib/api";

type RegistrationType = "Organization" | "Individual";

interface OrganizerVerificationStatusResponse {
  profile_type?: "organization" | "individual";
  onboarding_status?: string;
  verification_status?: string;
  status?: string;
  rejection_comment?: string;
  queue_status?: string;
}

interface OrganizationReviewSummaryResponse {
  onboarding_status?: string;
  verification_status?: string;
  organization_name?: string;
  organization_type?: string;
  field_of_study?: string;
  employee_size?: string;
  website_url?: string;
  organization_description?: string;
  representative?: {
    name?: string;
    position?: string;
    phone?: string;
    national_id?: string;
    workspace_id?: string;
  };
}

interface IndividualReviewSummaryResponse {
  onboarding_status?: string;
  verification_status?: string;
  profession?: string;
  personal_bio?: string;
  prior_experience?: string;
  social_media_link?: string;
}

interface SubmissionState {
  profileType: "organization" | "individual";
  verificationStatus?: string;
  rejectionComment?: string;
  queueStatus?: string;
}

interface OrganizerRegisterForm {
  registrationType: RegistrationType;
  user_id: string;
  organization_name: string;
  organization_type: string;
  field_of_study: string;
  employee_size: string;
  website_url: string;
  organization_description: string;
  business_licence: File | null;
  profession: string;
  personal_bio: string;
  social_media_link: string;
  prior_experience: string;
  national_id: File | null;
  government_issued_id: File | null;
  rep_name: string;
  rep_position: string;
  rep_phone: string;
  rep_national_id: string;
  rep_workspace_id: string;
  authorization_proof: File | null;
  organization_contact: string;
  alternative_contact: string;
  confirm_information_is_accurate: boolean;
  agree_terms_and_privacy: boolean;
}

const initialForm: OrganizerRegisterForm = {
  registrationType: "Organization",
  user_id: "",
  organization_name: "",
  organization_type: "",
  field_of_study: "",
  employee_size: "",
  website_url: "",
  organization_description: "",
  business_licence: null,
  profession: "",
  personal_bio: "",
  social_media_link: "",
  prior_experience: "",
  national_id: null,
  government_issued_id: null,
  rep_name: "",
  rep_position: "",
  rep_phone: "",
  rep_national_id: "",
  rep_workspace_id: "",
  authorization_proof: null,
  organization_contact: "",
  alternative_contact: "",
  confirm_information_is_accurate: false,
  agree_terms_and_privacy: false,
};

export default function OrganizerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [formData, setFormData] = useState<OrganizerRegisterForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const restoreDraft = async () => {
      const storedId = localStorage.getItem("user_id");
      if (storedId) {
        setFormData((prev) => ({ ...prev, user_id: storedId }));
      }

      try {
        const status = await api.get<OrganizerVerificationStatusResponse>(
          "/organizers/verification-status",
        );

        if (
          status.onboarding_status === "verification_submitted" ||
          status.onboarding_status === "registration_submitted"
        ) {
          router.replace("/organizer/dashboard");
          return;
        }

        if (status.profile_type === "organization") {
          const summary = await api.get<OrganizationReviewSummaryResponse>(
            "/organizers/organization/review-summary",
          );

          setFormData((prev) => ({
            ...prev,
            registrationType: "Organization",
            organization_name: summary.organization_name || "",
            organization_type: summary.organization_type || "",
            field_of_study: summary.field_of_study || "",
            employee_size: summary.employee_size || "",
            website_url: summary.website_url || "",
            organization_description: summary.organization_description || "",
            rep_name: summary.representative?.name || "",
            rep_position: summary.representative?.position || "",
            rep_phone: summary.representative?.phone || "",
            rep_national_id: summary.representative?.national_id || "",
            rep_workspace_id: summary.representative?.workspace_id || "",
          }));

          if (status.onboarding_status === "organization_step_1_completed") {
            setStep(3);
          } else if (status.onboarding_status === "organization_step_2_completed") {
            setStep(4);
          }
        }

        if (status.profile_type === "individual") {
          const summary = await api.get<IndividualReviewSummaryResponse>(
            "/organizers/individual/review-summary",
          );

          setFormData((prev) => ({
            ...prev,
            registrationType: "Individual",
            profession: summary.profession || "",
            personal_bio: summary.personal_bio || "",
            prior_experience: summary.prior_experience || "",
            social_media_link: summary.social_media_link || "",
          }));
        }
      } catch {
        // No draft yet is a valid state for newly verified organizers.
      } finally {
        setBootstrapping(false);
      }
    };

    void restoreDraft();
  }, []);

  const setField = (name: keyof OrganizerRegisterForm, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, type } = e.target;
    const value =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setField(name as keyof OrganizerRegisterForm, value);
  };

  const handleFileChange =
    (field: keyof OrganizerRegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setField(field, e.target.files?.[0] || null);
    };

  const submitStep2 = async () => {
    setError("");
    setLoading(true);

    try {
      if (formData.registrationType === "Organization") {
        if (!formData.business_licence) {
          throw new Error("Please upload your business licence.");
        }

        const data = new FormData();
        data.append("organization_name", formData.organization_name);
        data.append("organization_type", formData.organization_type);
        data.append("field_of_study", formData.field_of_study);
        data.append("employee_size", formData.employee_size);
        if (formData.website_url) data.append("website_url", formData.website_url);
        if (formData.organization_description) {
          data.append("organization_description", formData.organization_description);
        }
        data.append("business_licence", formData.business_licence);

        await api.post("/organizers/organization/step-1", data);
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (!formData.national_id || !formData.government_issued_id) {
          throw new Error("Please upload both your national ID and government-issued ID.");
        }

        const data = new FormData();
        data.append("profession", formData.profession);
        if (formData.personal_bio) data.append("personal_bio", formData.personal_bio);
        if (formData.prior_experience) data.append("prior_experience", formData.prior_experience);
        if (formData.social_media_link) data.append("social_media_link", formData.social_media_link);
        data.append("national_id", formData.national_id);
        data.append("government_issued_id", formData.government_issued_id);

        await api.post("/organizers/individual/register", data);
        router.push("/organizer/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Step 2 submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitStep3 = async () => {
    setError("");
    setLoading(true);

    try {
      if (!formData.authorization_proof) {
        throw new Error("Please upload the authorization proof letter.");
      }

      const data = new FormData();
      data.append("rep_name", formData.rep_name);
      data.append("rep_position", formData.rep_position);
      data.append("rep_phone", formData.rep_phone);
      data.append("rep_national_id", formData.rep_national_id);
      data.append("rep_workspace_id", formData.rep_workspace_id);
      data.append("authorization_proof", formData.authorization_proof);

      await api.post("/organizers/organization/step-2", data);
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Step 3 submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitStep4 = async () => {
    setError("");
    setLoading(true);

    try {
      if (!formData.organization_contact) {
        throw new Error("Please enter the primary organization contact.");
      }
      if (!formData.confirm_information_is_accurate || !formData.agree_terms_and_privacy) {
        throw new Error("Please confirm the declarations before submitting.");
      }

      const data = new FormData();
      data.append("organization_contact", formData.organization_contact);
      if (formData.alternative_contact) {
        data.append("alternative_contact", formData.alternative_contact);
      }
      data.append(
        "confirm_information_is_accurate",
        String(formData.confirm_information_is_accurate),
      );
      data.append("agree_terms_and_privacy", String(formData.agree_terms_and_privacy));

      await api.post("/organizers/organization/step-3/submit", data);
      router.push("/organizer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Final submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const fileCard = (
    id: string,
    label: string,
    file: File | null,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  ) => (
    <label
      htmlFor={id}
      className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center transition hover:border-[#062E22] hover:bg-slate-50"
    >
      <input
        id={id}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={onChange}
      />
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, or WEBP up to 5MB</p>
      {file && <p className="mt-3 text-sm font-semibold text-[#062E22]">{file.name}</p>}
    </label>
  );

  return (
    <>
      <LoginHeader />
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-[#8CB98820] p-6 shadow-xl sm:p-8">
          {bootstrapping ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
                <p className="text-sm text-slate-500">Loading your registration draft...</p>
              </div>
            </div>
          ) : (
            <>
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-amber-600">STEP {step} OF 4</p>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[#062E22]">
                {step === 2 && "Organizer Profile Setup"}
                {step === 3 && "Representative Verification"}
                {step === 4 && "Confirm & Submit"}
              </h1>
              <span className="text-xs text-slate-500">{step === 2 ? "66%" : step === 3 ? "90%" : "100%"} Completed</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full bg-[#062E22] ${
                  step === 2 ? "w-2/3" : step === 3 ? "w-[90%]" : "w-full"
                }`}
              />
            </div>
          </div>

          {step === 2 && (
            <section className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">I am registering as:</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["Individual", "Organization"] as const).map((type) => {
                    const active = formData.registrationType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setField("registrationType", type)}
                        className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-[#062E22] bg-white text-[#062E22]"
                            : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-white"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.registrationType === "Organization" ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    name="organization_name"
                    value={formData.organization_name}
                    onChange={handleChange}
                    placeholder="Organization name"
                    className="w-full rounded-lg border border-slate-300 p-3"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <select
                      name="organization_type"
                      value={formData.organization_type}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 p-3"
                      aria-label="Organization type"
                    >
                      <option value="">Select organization type</option>
                      <option value="ngo">NGO</option>
                      <option value="private">Private Company</option>
                      <option value="government">Government</option>
                    </select>
                    <select
                      name="field_of_study"
                      value={formData.field_of_study}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 p-3"
                      aria-label="Field of study or industry"
                    >
                      <option value="">Select industry</option>
                      <option value="tech">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="health">Healthcare</option>
                      <option value="education">Education</option>
                    </select>
                  </div>
                  <select
                    name="employee_size"
                    value={formData.employee_size}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-3"
                    aria-label="Organization size"
                  >
                    <option value="">Select organization size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                  <input
                    type="url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                    placeholder="Website URL"
                    className="w-full rounded-lg border border-slate-300 p-3"
                  />
                  <textarea
                    name="organization_description"
                    value={formData.organization_description}
                    onChange={handleChange}
                    placeholder="Briefly describe what your organization does"
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 p-3"
                  />
                  {fileCard(
                    "business_licence",
                    "Upload Business Licence / Registration Document",
                    formData.business_licence,
                    handleFileChange("business_licence"),
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    placeholder="Profession / Role"
                    className="w-full rounded-lg border border-slate-300 p-3"
                  />
                  <textarea
                    name="personal_bio"
                    value={formData.personal_bio}
                    onChange={handleChange}
                    placeholder="Personal bio"
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 p-3"
                  />
                  <input
                    type="url"
                    name="social_media_link"
                    value={formData.social_media_link}
                    onChange={handleChange}
                    placeholder="Social media or portfolio link"
                    className="w-full rounded-lg border border-slate-300 p-3"
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">Have you hosted events before?</p>
                    <div className="flex gap-6">
                      {["yes", "no"].map((value) => (
                        <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name="prior_experience"
                            value={value}
                            checked={formData.prior_experience === value}
                            onChange={handleChange}
                          />
                          {value === "yes" ? "Yes, I have" : "No, I am new to this"}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {fileCard(
                      "national_id",
                      "Upload National ID / Passport",
                      formData.national_id,
                      handleFileChange("national_id"),
                    )}
                    {fileCard(
                      "government_issued_id",
                      "Upload Government-Issued ID",
                      formData.government_issued_id,
                      handleFileChange("government_issued_id"),
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submitStep2}
                  disabled={loading}
                  className="rounded-lg bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-50"
                >
                  {loading ? "Saving..." : formData.registrationType === "Organization" ? "Continue to Step 3" : "Submit Registration"}
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  name="rep_name"
                  value={formData.rep_name}
                  onChange={handleChange}
                  placeholder="Representative full name"
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
                <input
                  type="text"
                  name="rep_position"
                  value={formData.rep_position}
                  onChange={handleChange}
                  placeholder="Representative position"
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
                <input
                  type="text"
                  name="rep_phone"
                  value={formData.rep_phone}
                  onChange={handleChange}
                  placeholder="Representative phone number"
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
                <label htmlFor="rep_national_id" className="sr-only">
                  Representative ID type
                </label>
                <select
                  id="rep_national_id"
                  name="rep_national_id"
                  value={formData.rep_national_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-3"
                  aria-label="Representative ID type"
                >
                  <option value="">Select ID type</option>
                  <option value="national">National ID</option>
                  <option value="kebele">Kebele ID</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <input
                type="text"
                name="rep_workspace_id"
                value={formData.rep_workspace_id}
                onChange={handleChange}
                placeholder="Workspace ID / employee number"
                className="w-full rounded-lg border border-slate-300 p-3"
              />
              {fileCard(
                "authorization_proof",
                "Upload Authorization Proof Letter",
                formData.authorization_proof,
                handleFileChange("authorization_proof"),
              )}

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-[#062E22]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitStep3}
                  disabled={loading}
                  className="rounded-lg bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Continue to Step 4"}
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <input
                type="text"
                name="organization_contact"
                value={formData.organization_contact}
                onChange={handleChange}
                placeholder="Primary organization contact"
                className="w-full rounded-lg border border-slate-300 p-3"
              />
              <input
                type="text"
                name="alternative_contact"
                value={formData.alternative_contact}
                onChange={handleChange}
                placeholder="Alternative contact"
                className="w-full rounded-lg border border-slate-300 p-3"
              />
              <label className="flex items-start gap-3 rounded-lg bg-white p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="confirm_information_is_accurate"
                  checked={formData.confirm_information_is_accurate}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>I confirm the information provided is accurate and complete.</span>
              </label>
              <label className="flex items-start gap-3 rounded-lg bg-white p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="agree_terms_and_privacy"
                  checked={formData.agree_terms_and_privacy}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-[#062E22]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitStep4}
                  disabled={loading}
                  className="rounded-lg bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Registration"}
                </button>
              </div>
            </section>
          )}

          {error && <p className="mt-6 text-sm font-medium text-red-600">{error}</p>}
            </>
          )}
        </div>
      </main>
    </>
  );
}
