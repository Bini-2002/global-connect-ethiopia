"use client";

import LoginHeader from "@/components/loginHeader";
import { useState } from "react";
import Image from "next/image";
import OrgIndividualReg from "@/components/organizerComponents.tsx/orgIndividualReg";
import Step2orgReg from "@/components/organizerComponents.tsx/step2orgReg";
import Step3OrgReg from "@/components/organizerComponents.tsx/Step3OrgReg";

export default function OrganizationDetailsPage() {
  const [step, setStep] = useState(2);
  const [formData, setFormData] = useState({
    registrationType: "Organization",
    orgName: "",
    position: "",
    orgType: "",
    industry: "",
    profession:"",
    prsonalBio:"",
    SocialLink:"",
    Experience:"",
    companySize: "",
    website: "",
    description: "",
    hostedEventsBefore: '',
    licenseFile: null as File | null,
    NationalID: null as File |null,
  });


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    const name = e.target.name as keyof typeof formData;
    setFormData(prev => ({ ...prev, [name]: file }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Navigate to next step or send to backend
  };
  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
  
    // Optional: validate file type/size
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      alert("Only PDF, JPG, PNG files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }
  
    setFormData((prev) => ({ ...prev, licenseFile: file }));
  };
  return (
    <>
    <LoginHeader/>
    <div className="min-h-screen mt-18 bg-gradient-to-br from-slate-50 to-slate-100  text-[#062E22] flex flex-col items-center p-6">
        {step ===2 && (
          <Step2orgReg           formData={formData}
          setFormData={setFormData}
          handleDrop={handleDrop}
          handleChange={handleChange}
          nextStep={() => setStep(3)}
          handleSubmit={handleSubmit} 
          handleFileUpload={handleFileUpload}
          />

        )}
                {step ===3 && (
          <Step3OrgReg           
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
          handleSubmit={handleSubmit} 
          backStep={()=> setStep(2)}
          handleFileUpload={handleFileUpload}
          />

        )}
    </div> </>
  );
}
