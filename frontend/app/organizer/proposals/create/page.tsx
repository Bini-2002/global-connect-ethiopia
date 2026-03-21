"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Shield, Upload, DollarSign, Target, Users, X } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import AIModal from "@/components/organizer/AIModal";
import { getToken } from "@/app/lib/auth";

type Proposal = {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
  expected_attendees: number;
  budget_estimate: string;
  program_overview: string;
  event_objectives: string;
  target_audience: string[];
  security_level: string;
  personnel_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

// API base URL - adjust this to your backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function CreateProposalPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
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
    documents: null as File | null,
  });

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveToSession = async (formData: any) => {
    const documentData = formData.documents 
      ? {
          document_base64: await fileToBase64(formData.documents),
          document_name: formData.documents.name,
          document_size: formData.documents.size,
        }
      : { document_base64: null, document_name: null, document_size: null };

    const proposalData = {
      ...formData,
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

      setError(null);
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

      const response = await axios.post(`${API_BASE_URL}/proposals`, formDataToSend, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      // Clear localStorage after saving to backend
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

  const handleSubmitProposal = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/proposals/${id}/submit`, {}, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      setProposals(prev =>
        prev.map(p => (p.id === id ? response.data : p))
      );
      
      setError(null);
      setToast({ message: 'Proposal submitted successfully!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      console.error("Error submitting proposal:", err);
      setError(err.response?.data?.message || "Failed to submit proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = async (id: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/proposals/${id}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      setSelectedProposal(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching proposal:", err);
      setError(err.response?.data?.message || "Failed to fetch proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    // Validate file size (max 5MB)
    if (file && file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    // Validate file type
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
    router.push('/organizer/create-event');
  };

  return (
    <>
      {/* Toast Notification */}
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

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Mobile Quick Links - appears on mobile only */}
          <div className="block lg:hidden space-y-4 mb-6">
            <div className="p-6 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, #35554C 0%, #010C27 70%, #EC5B13 100%)" }}>
              <h2 className="text-lg font-bold text-white flex gap-2 mb-3">
                <Image src='/lic.png' height={25} width={25} alt="" /> Licensing Regulations
              </h2>
              <ul className="mt-3 space-y-2 text-white/90 text-sm font-light">
                <li>• Submit 21 business days before event</li>
                <li>• Noise permits from Environmental Bureau</li>
              </ul>
              <Link href='/read' className="text-[#EC5B13] text-sm block mt-3 font-semibold">
                Read Proclamation No. 1234/2021 →
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row md:justify-between gap-8">
            <div className="w-full lg:w-[600px] xl:w-[800px] space-y-6 text-[#062E22]">
              <form id="proposalForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 mb-6 flex flex-col space-y-6 border border-gray-100">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <div className="p-2 bg-[#062E22]/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-[#062E22]" />
                    </div>
                    <h1 className="font-bold text-xl text-[#062E22]">Event Information</h1>
                  </div>
                  
                  <label className="text-sm font-semibold text-gray-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Enter event title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                    required
                    disabled={loading}
                  />
                  
                  <label className="text-sm font-semibold text-gray-700 mb-2">Event Description</label>
                  <textarea
                    name="description"
                    placeholder="Describe your event in detail..."
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                    rows={4}
                    required
                    disabled={loading}
                  />
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 flex flex-col">
                      <label className="text-sm font-semibold text-gray-700 mb-2">Event Type</label>
                      <input
                        type="text"
                        name="event_type"
                        placeholder="e.g., Conference, Concert"
                        value={formData.event_type}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="text-sm font-semibold text-gray-700 mb-2">Expected Attendees</label>
                      <input
                        type="number"
                        name="expected_attendees"
                        placeholder="Number of attendees"
                        value={formData.expected_attendees}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        required
                        min="1"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col flex-1">
                      <label className="text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-sm font-semibold text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <label className="text-sm font-semibold text-gray-700 mb-2">Event Location</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Full address of the venue"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Program Details */}
                <section className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-5 border border-gray-100">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <div className="p-2 bg-[#EC5B13]/10 rounded-lg">
                      <FileText className="w-5 h-5 text-[#EC5B13]" />
                    </div>
                    <h2 className="text-lg font-bold text-[#062E22]">Program Details</h2>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Program Overview
                    </label>
                    <textarea
                      name="programOverview"
                      placeholder="Describe the detailed schedule and activities of your event..."
                      value={formData.programOverview}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                      rows={4}
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Event Objectives
                    </label>
                    <textarea
                      name="eventObjectives"
                      placeholder="What are the primary goals and outcomes you expect from this event?"
                      value={formData.eventObjectives}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                      rows={3}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Target Audience (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {formData.targetAudience.map((audience, idx) => (
                        <div
                          key={idx}
                          className="flex items-center bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200"
                        >
                          <input
                            type="text"
                            value={audience}
                            onChange={(e) => handleAudienceChange(idx, e.target.value)}
                            className="bg-transparent outline-none text-sm w-24 md:w-auto"
                            placeholder="Audience type"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => removeAudience(idx)}
                            className="ml-2 text-green-600 font-bold hover:text-red-500 transition-colors"
                            disabled={loading}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addAudience}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full hover:bg-blue-100 text-sm font-semibold border border-blue-200 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        + Add Audience Type
                      </button>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Budget */}
                  <section className="bg-white flex-1 shadow-lg rounded-xl p-6 md:p-8 space-y-4 border border-gray-100">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <h2 className="text-lg font-bold text-[#062E22]">Budget</h2>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">Estimated Total Budget (ETB)</label>
                      <input
                        type="number"
                        name="budget_estimate"
                        placeholder="Enter budget amount"
                        value={formData.budget_estimate}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        min="0"
                        disabled={loading}
                      />
                    </div>
                  </section>

                  {/* Security Plan */}
                  <section className="bg-white flex-1 shadow-lg rounded-xl p-6 md:p-8 space-y-4 border border-gray-100">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg font-bold text-[#062E22]">Security Plan</h2>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">Security Level</label>
                      <select
                        name="securityLevel"
                        value={formData.securityLevel}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        disabled={loading}
                      >
                        <option value="Standard (Private Security)">Standard (Private Security)</option>
                        <option value="High (Police + Private)">High (Police + Private)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">Personnel Count</label>
                      <input
                        type="number"
                        name="personnelCount"
                        placeholder="Number of security personnel"
                        value={formData.personnelCount}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
                        min="0"
                        disabled={loading}
                      />
                    </div>
                  </section>
                </div>

                {/* Document Upload */}
                <section className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4 border border-gray-100">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Upload className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-[#062E22]">Document Upload</h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    Please ensure the document name clearly indicates the type and purpose of the document.
                  </p>
                  {hadDocument && !formData.documents && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        A document was previously attached. Please re-upload it.
                      </p>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#062E22] transition-colors">
                    <input
                      type="file"
                      accept=".zip,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="documents"
                      disabled={loading}
                    />
                    <label 
                      htmlFor="documents" 
                      className={`cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-gray-100 rounded-full">
                          <Upload className="w-6 h-6 text-[#062E22]" />
                        </div>
                        <span className="text-[#062E22] font-semibold text-sm md:text-base">
                          Upload Supporting Documents
                        </span>
                        <span className="text-gray-500 text-xs">
                          ZIP or PDF files only, Max 5MB
                        </span>
                      </div>
                    </label>
                    {formData.documents && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                          <FileText className="w-4 h-4" />
                          {formData.documents.name}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </form>
            </div>

            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden lg:block lg:w-80 xl:w-96 space-y-6">
              <div className="p-8 flex-col flex gap-4 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, #35554C 0%, #010C27 70%, #EC5B13 100%)" }}>
                <h2 className="text-xl font-bold text-white flex gap-3 items-center">
                  <Image src='/lic.png' height={28} width={28} alt="" /> Licensing Regulations
                </h2>
                <ul className="mt-4 space-y-3 font-light text-white/90 text-sm leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#EC5B13]">•</span>
                    All events must be submitted at least 21 business days before the event date.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#EC5B13]">•</span>
                    Noise permits must be obtained separately from the Addis Ababa Environmental Bureau.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#EC5B13]">•</span>
                    Foreign performers require additional visa clearances from Immigration.
                  </li>
                </ul>
                <Link href='/read' className="text-[#EC5B13] font-semibold hover:underline mt-2 inline-block">
                  Read Proclamation No. 1234/2021 →
                </Link>
              </div>

              {/* Help & Resources */}
              <section className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
                <h2 className="text-lg font-bold text-[#062E22] mb-4">Help & Resources</h2>
                <a
                  href="/sample-proposal-template.pdf"
                  download
                  className="flex items-center gap-2 text-gray-600 text-sm hover:text-[#062E22] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Sample Proposal Template (PDF, 1.3MB)
                </a>
              </section>

              {/* AI Assistant Box - Desktop version */}
              <section className="bg-[#062E22] text-white rounded-xl p-6 space-y-3 shadow-lg flex flex-col items-center text-center">
                <span className="font-bold text-lg">Ask AI Assistant</span>
                <p className="mb-2 text-white/80 text-sm">
                  Need help creating your event proposal? I'm here to assist you.
                </p>
                <button 
                  className="w-full px-4 py-3 bg-white text-[#062E22] rounded-lg hover:bg-gray-100 font-semibold transition-colors"
                  onClick={() => setIsAIModalOpen(true)}
                >
                  Get Started
                </button>
              </section>
            </div>
          </div>

          {/* Floating AI Icon - visible on mobile */}
          <div className="fixed bottom-6 md:bottom-40 right-6 z-50">
            <div className="relative group">
              <Image 
                width={60} 
                height={60} 
                alt='AI Assistant' 
                src='/ai.png' 
                className="cursor-pointer hover:opacity-90 transition" 
                onClick={() => setIsAIModalOpen(true)}
              />
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#062E22] text-white text-sm rounded-lg p-2 whitespace-nowrap">
                Ask AI Assistant
              </div>
            </div>
          </div>

          {/* AI Modal */}
          <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />

          {/* Exit Confirmation Modal */}
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
        </div>
      </main>
    </>
  );
}
  