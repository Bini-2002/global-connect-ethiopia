"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import AIModal from "@/components/organizer/AIModal";
import { getToken } from "@/app/lib/auth";
import ProposalForm, { ProposalFormData } from "./ProposalForm";
import ProposalSidebar, { MobileLicensingCard, FloatingAIButton } from "./ProposalSidebar";
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const initialFormData: ProposalFormData = {
  title: "",
  description: "",
  event_type: "",
  start_date: "",
  end_date: "",
  location: "",
  expected_attendees: 0,
  budget_estimate: '',
  programOverview: "",
  eventObjectives: "",
  targetAudience: ["Youth", "Investors"],
  securityLevel: "Standard (Private Security)",
  personnelCount: 0,
  documents: null,
};

export default function CreateProposalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState<ProposalFormData>(initialFormData);
  const [hadDocument, setHadDocument] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('pendingProposal');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setHadDocument(!!parsed.document_name);
        setFormData({
          title: parsed.title || "",
          description: parsed.description || "",
          event_type: parsed.event_type || "",
          start_date: parsed.start_date ? parsed.start_date.split('T')[0] : "",
          end_date: parsed.end_date ? parsed.end_date.split('T')[0] : "",
          location: parsed.location || "",
          expected_attendees: parsed.expected_attendees || 0,
          budget_estimate: parsed.budget_estimate || parsed.budget || '',
          programOverview: parsed.programOverview || parsed.program_overview || "",
          eventObjectives: parsed.eventObjectives || parsed.event_objectives || "",
          targetAudience: parsed.targetAudience || parsed.target_audience || ["Youth", "Investors"],
          securityLevel: parsed.securityLevel || parsed.security_level || "Standard (Private Security)",
          personnelCount: parsed.personnelCount || parsed.personnel_count || 0,
          documents: null,
        });
      } catch (e) {
        console.error("Error parsing saved proposal data:", e);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? (value === '' ? 0 : Number(value)) : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const saveToSession = async (data: ProposalFormData) => {
    const documentData = data.documents 
      ? {
          document_base64: await fileToBase64(data.documents),
          document_name: data.documents.name,
          document_size: data.documents.size,
        }
      : { document_base64: null, document_name: null, document_size: null };

    const proposalData = {
      ...data,
      ...documentData,
      documents: null,
      id: `temp-${Date.now()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('pendingProposal', JSON.stringify(proposalData));
    return proposalData;
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.title.trim()) errors.push("Title is required");
    if (!formData.description.trim()) errors.push("Description is required");
    if (!formData.event_type) errors.push("Event type is required");
    if (!formData.start_date) errors.push("Start date is required");
    if (!formData.end_date) errors.push("End date is required");
    if (!formData.location.trim()) errors.push("Location is required");
    if (formData.expected_attendees <= 0) errors.push("Expected attendees must be greater than 0");
    if (!formData.budget_estimate || Number(formData.budget_estimate) <= 0) errors.push("Budget estimate is required");
    if (!formData.programOverview.trim()) errors.push("Program overview is required");
    if (!formData.eventObjectives.trim()) errors.push("Event objectives is required");
    if (formData.targetAudience.length === 0) errors.push("At least one target audience is required");

    if (errors.length > 0) {
      setError(errors.join(". "));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);

    try {
      await saveToSession(formData);

      const fileInput = document.getElementById('documents') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      router.push('/organizer/proposal-review');
    } catch (err: any) {
      console.error("Error saving proposal:", err);
      setError("Failed to save proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title || '');
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('event_type', formData.event_type || '');
      formDataToSend.append('start_date', formData.start_date || '');
      formDataToSend.append('end_date', formData.end_date || '');
      formDataToSend.append('location', formData.location || '');
      formDataToSend.append('expected_attendees', String(formData.expected_attendees || 0));
      formDataToSend.append('budget_estimate', String(formData.budget_estimate || 0));
      formDataToSend.append('program_overview', formData.programOverview || '');
      formDataToSend.append('event_objectives', formData.eventObjectives || '');
      formDataToSend.append('target_audience', (formData.targetAudience || []).join(','));
      formDataToSend.append('security_level', formData.securityLevel || 'Standard (Private Security)');
      formDataToSend.append('personnel_count', String(formData.personnelCount || 0));

      if (formData.documents) {
        formDataToSend.append('document', formData.documents);
      }

      await axios.post(`${API_BASE_URL}/proposals`, formDataToSend, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      localStorage.removeItem('pendingProposal');
      
      setToast({ message: 'Submitted as draft', type: 'success' });
      setTimeout(() => {
        setToast(null);
        router.push('/organizer/proposals');
      }, 1500);
    } catch (err: any) {
      console.error("Error saving draft:", err);
      setToast({ message: err.response?.data?.detail || 'Failed to save draft', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file && file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    if (file && !file.type.match(/application\/(zip|pdf)/) && 
        !file.name.match(/\.(zip|pdf)$/i)) {
      setError("Only ZIP and PDF files are allowed");
      return;
    }

    setFormData((prev) => ({ ...prev, documents: file }));
    setError(null);
  };

  const addAudience = () => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: [...prev.targetAudience, ""],
    }));
  };

  const removeAudience = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: prev.targetAudience.filter((_, i) => i !== index),
    }));
  };

  const handleAudienceChange = (index: number, value: string) => {
    const updated = [...formData.targetAudience];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, targetAudience: updated }));
  };

  const hasUnsavedChanges = () => {
    return (
      formData.title.trim() !== "" ||
      formData.description.trim() !== "" ||
      formData.event_type.trim() !== "" ||
      formData.location.trim() !== "" ||
      formData.start_date !== "" ||
      formData.end_date !== "" ||
      formData.expected_attendees > 0 ||
      formData.budget_estimate !== '' ||
      formData.programOverview.trim() !== "" ||
      formData.eventObjectives.trim() !== "" ||
      formData.personnelCount > 0 ||
      formData.documents !== null
    );
  };

  const handleBack = () => {
    if (hasUnsavedChanges()) {
      setShowExitModal(true);
    } else {
      router.push('/organizer/create-event');
    }
  };

  const handleExitModalSave = async () => {
    setShowExitModal(false);
    await handleSaveDraft();
    router.push('/organizer/create-event');
  };

  const handleExitModalDiscard = () => {
    setShowExitModal(false);
    localStorage.removeItem('pendingProposal');
    router.push('/organizer/create-event');
  };

  return (
    <>
      <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
        <Image
          src="/Ellipse2.png"
          alt=""
          width={200}
          height={400}
          className="opacity-80"
        />
      </div>
      <div className="fixed bottom-6 right-0 -z-10 pointer-events-none">
        <Image
          src="/Ellipse3.png"
          alt=""
          width={200}
          height={400}
          className="opacity-80"
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
      
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search " />
      
      <main className="flex-1 md:ml-60 md:mt-10">
        <div className="min-h-screen p-6 md:p-8 lg:p-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">Create Event Proposal</h1>
              <p className="text-gray-500 mt-1">Fill in the details below to create your event proposal</p>
            </div>
            <div className="flex gap-3 h-10 order-first md:order-last">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 border border-[#CBD5E1] text-[#062E22] rounded-lg hover:bg-gray-100 text-sm md:text-base"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-4 py-2 border border-[#CBD5E1] text-[#062E22] rounded-lg hover:bg-gray-100 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📩 {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                form="proposalForm"
                disabled={loading}
                className="px-6 py-2 bg-[#062E22] text-white rounded-lg hover:bg-green-800 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Mobile Licensing Card */}
          <MobileLicensingCard onOpenAIModal={() => setIsAIModalOpen(true)} />

          <div className="flex flex-col lg:flex-row md:justify-between gap-8">
            {/* Form */}
            <div className="w-full lg:w-[600px] xl:w-[800px]">
              <ProposalForm
                formData={formData}
                loading={loading}
                onChange={handleChange}
                onFileUpload={handleFileUpload}
                onAddAudience={addAudience}
                onRemoveAudience={removeAudience}
                onAudienceChange={handleAudienceChange}
                hadDocument={hadDocument}
                onSubmit={handleSubmit}
              />
            </div>

            {/* Sidebar */}
            <ProposalSidebar
              isAIModalOpen={isAIModalOpen}
              onOpenAIModal={() => setIsAIModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Floating AI Button */}
      <FloatingAIButton onOpenAIModal={() => setIsAIModalOpen(true)} />

      {/* AI Modal */}
      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#062E22]">Unsaved Changes</h2>
                <button
                  onClick={() => setShowExitModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                You have unsaved changes in your proposal. Would you like to save as draft before leaving?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleExitModalDiscard}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleExitModalSave}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#062E22] text-white rounded-lg hover:bg-[#0a4a37] font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
