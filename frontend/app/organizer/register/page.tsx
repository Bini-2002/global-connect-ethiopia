"use client";

import LoginHeader from "@/components/loginHeader";
import { useState, useEffect } from "react";
import Step2orgReg from "@/components/organizerComponents/step2orgReg";
import Step3OrgReg from "@/components/organizerComponents/Step3OrgReg";
import Step4OrgReg from "@/components/organizerComponents/step4orgreg";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function OrganizationDetailsPage() {
  const router = useRouter();
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const [step, setStep] = useState(2);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormDataType>({
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
    organization_contact: "",
    alternative_contact: "",
    confirm_information_is_accurate: false,
    agree_terms_and_privacy: false,
  });

  // Load user_id from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) {
      setFormData((prev) => ({ ...prev, user_id: storedId }));
    }
  }, []);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, [e.target.name]: file }));
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, field: string) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    setFormData((prev) => ({ ...prev, [field]: e.dataTransfer.files[0] }));
  };

  // Submit Step 2
  const handleSubmitStep2 = async () => {
    try {
      const data = new FormData();

      if (formData.registrationType === "Organization") {
        if (!formData.business_licence) {
          setError("Upload business license");
          return;
        }
        data.append("organization_name", formData.organization_name);
        data.append("organization_type", formData.organization_type);
        data.append("field_of_study", formData.field_of_study);
        data.append("employee_size", formData.employee_size);
        data.append("website_url", formData.website_url);
        data.append("organization_description", formData.organization_description);
        data.append("business_licence", formData.business_licence);
        data.append("user_id", formData.user_id);

        await axios.post(`${BASE_URL}/organizers/organization/step-1`, data);
        setStep(3);
      } else {
        if (!formData.government_issued_id) {
          setError("Upload ID");
          return;
        }
        data.append("profession", formData.profession);
        data.append("personal_bio", formData.personal_bio);
        data.append("social_media_link", formData.social_media_link);
        data.append("prior_experience", formData.prior_experience);
        if (formData.government_issued_id) data.append("government_issued_id", formData.government_issued_id);
        if (formData.national_id) data.append("national_id", formData.national_id);
        data.append("user_id", formData.user_id);

        await axios.post(`${BASE_URL}/organizers/individual/register`, data);
        router.push("/organizer/dashboard");
        return;
      }

      setError("");
      
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("Submission failed. Please check your input and try again.");
    }
  };


  const handleSubmitStep3 = async () => {
    try {
      const data = new FormData();
      if (!formData.government_issued_id) {
        setError("Upload Government ID");
        return;
      }
      if (!formData.workspace_id) {
        setError("Upload Workspace ID");
        return;
      }
      if (!formData.authorization_letter) {
        setError("Upload Authorization Letter");
        return;
      }

      data.append("id_type", formData.id_type);
      data.append("government_issued_id", formData.government_issued_id);
      data.append("workspace_id", formData.workspace_id);
      data.append("authorization_letter", formData.authorization_letter);
      data.append("user_id", formData.user_id);

      await axios.post(`${BASE_URL}/organizers/organization/step-2`, data);

      setError("");
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("Submission failed. Please check your files and try again.");
    }
  };

  // Submit Step 4 (Confirm & Contact)
const handleSubmitStep4 = async () => {
  try {
    // Validate required fields
    if (!formData.organization_contact) {
      setError("Please enter the primary organization contact.");
      return;
    }
    if (!formData.confirm_information_is_accurate) {
      setError("You must confirm that the information is accurate.");
      return;
    }
    if (!formData.agree_terms_and_privacy) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    // Prepare form data
    const data = new FormData();
    data.append("organization_contact", formData.organization_contact);
    if (formData.alternative_contact) data.append("alternative_contact", formData.alternative_contact);
    data.append("confirm_information_is_accurate", String(formData.confirm_information_is_accurate));
    data.append("agree_terms_and_privacy", String(formData.agree_terms_and_privacy));
    data.append("user_id", formData.user_id);

    // Submit to backend
    await axios.post(`${BASE_URL}/organizers/organization/step-3/submit`, data);

    setError("");
    alert("Registration submitted successfully!");
    router.push("/organizer/dashboard");
  } catch (err) {
    console.error(err);
    setError("Submission failed. Please try again.");
  }
};
  return (
    <>
      <LoginHeader />

      <div className="min-h-screen mt-18 flex flex-col items-center p-6">
        {step === 2 && (
          <Step2orgReg
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            handleDrop={handleDrop}
            nextStep={()=> setStep(3)}
            error={error}
          />
        )}

        {step === 3 && (
          <Step3OrgReg
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            nextStep={() => {
              setStep(4);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            backStep={() => {
              setStep(2);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {step === 4 && (
          <Step4OrgReg
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            backStep={() => {
              setStep(3);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </div>
    </>
  );
}