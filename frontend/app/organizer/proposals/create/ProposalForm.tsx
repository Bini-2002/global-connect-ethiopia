'use client';

import { Calendar, FileText, Shield, Upload, DollarSign, Target, Users } from 'lucide-react';

interface ProposalFormProps {
  formData: ProposalFormData;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddAudience: () => void;
  onRemoveAudience: (index: number) => void;
  onAudienceChange: (index: number, value: string) => void;
  hadDocument: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export interface ProposalFormData {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
  expected_attendees: number;
  budget_estimate: string;
  programOverview: string;
  eventObjectives: string;
  targetAudience: string[];
  securityLevel: string;
  personnelCount: number;
  documents: File | null;
}

interface ProposalFormProps {
  formData: ProposalFormData;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddAudience: () => void;
  onRemoveAudience: (index: number) => void;
  onAudienceChange: (index: number, value: string) => void;
  hadDocument: boolean;
}

export default function ProposalForm({
  formData,
  loading,
  onChange,
  onFileUpload,
  onAddAudience,
  onRemoveAudience,
  onAudienceChange,
  hadDocument,
  onSubmit,
}: ProposalFormProps) {
  return (
    <form id="proposalForm" onSubmit={onSubmit} className="space-y-6">
      {/* Event Information */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 mb-6 flex flex-col space-y-6 border border-gray-100">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="p-2 bg-[#062E22]/10 rounded-lg">
            <Calendar className="w-5 h-5 text-[#062E22]" />
          </div>
          <h2 className="font-bold text-xl text-[#062E22]">Event Information</h2>
        </div>
        
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Title</label>
          <input
            type="text"
            name="title"
            placeholder="Enter event title"
            value={formData.title}
            onChange={onChange}
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Description</label>
          <textarea
            name="description"
            placeholder="Describe your event in detail..."
            value={formData.description}
            onChange={onChange}
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
            rows={4}
            required
            disabled={loading}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Type</label>
            <input
              type="text"
              name="event_type"
              placeholder="e.g., Conference, Concert"
              value={formData.event_type}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              required
              disabled={loading}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Expected Attendees</label>
            <input
              type="number"
              name="expected_attendees"
              placeholder="Number of attendees"
              value={formData.expected_attendees}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              required
              min="1"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              required
              disabled={loading}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">End Date</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              required
              disabled={loading}
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Location</label>
          <input
            type="text"
            name="location"
            placeholder="Full address of the venue"
            value={formData.location}
            onChange={onChange}
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Program Details */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-5 border border-gray-100">
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
            onChange={onChange}
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
            onChange={onChange}
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
                  onChange={(e) => onAudienceChange(idx, e.target.value)}
                  className="bg-transparent outline-none text-sm w-24 md:w-auto"
                  placeholder="Audience type"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => onRemoveAudience(idx)}
                  className="ml-2 text-green-600 font-bold hover:text-red-500 transition-colors"
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddAudience}
              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full hover:bg-blue-100 text-sm font-semibold border border-blue-200 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              + Add Audience Type
            </button>
          </div>
        </div>
      </div>

      {/* Budget & Security */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Budget */}
        <div className="bg-white flex-1 shadow-lg rounded-xl p-6 md:p-8 space-y-4 border border-gray-100">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-[#062E22]">Budget</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Estimated Total Budget (ETB)</label>
            <input
              type="number"
              name="budget_estimate"
              placeholder="Enter budget amount"
              value={formData.budget_estimate}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              min="0"
              disabled={loading}
            />
          </div>
        </div>

        {/* Security Plan */}
        <div className="bg-white flex-1 shadow-lg rounded-xl p-6 md:p-8 space-y-4 border border-gray-100">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-[#062E22]">Security Plan</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Security Level</label>
            <select
              name="securityLevel"
              value={formData.securityLevel}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              disabled={loading}
            >
              <option value="Standard (Private Security)">Standard (Private Security)</option>
              <option value="High (Police + Private)">High (Police + Private)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Personnel Count</label>
            <input
              type="number"
              name="personnelCount"
              placeholder="Number of security personnel"
              value={formData.personnelCount}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/30 focus:border-[#062E22] transition-colors"
              min="0"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Document Upload */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4 border border-gray-100">
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
            onChange={onFileUpload}
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
      </div>
    </form>
  );
}
