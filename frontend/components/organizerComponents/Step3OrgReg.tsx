import React, { useState, useRef } from 'react';
import Image from 'next/image';

export default function Step3OrgReg({
  formData,
  setFormData,
  handleChange,
  handleFileUpload,
  handleSubmit,
  nextStep,
  backStep,
}: any) {
  const [idType, setIdType] = useState<'national' | 'kebele' | 'passport'>('national');
  const governmentIdRef = useRef<HTMLInputElement | null>(null);
  const workspaceIdRef = useRef<HTMLInputElement | null>(null);
  const authLetterRef = useRef<HTMLInputElement | null>(null);

  const updateFile = (field: string, file: File | null) => {
    if (!file) return;
    setFormData((prev: any) => ({
      ...prev,
      [field]: file,
    }));
  };

  return (
    <div className="max-w-3xl w-full bg-[#8CB98820] rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
      {/* Header */}
      <div className="w-full mb-6 sm:mb-8">
        <h2 className="text-sm font-semibold text-amber-600 mb-2">STEP 3 OF 4</h2>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <h1 className="text-2xl font-bold text-[#062E22]">Representative Verification</h1>
          <span className="text-xs">90% Completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-5">
          <div className="bg-[#062E22] h-2 rounded-full" style={{ width: '90%' }} />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-8">
        {/* Representative Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[#062E2210] pb-4 mb-4 flex items-center gap-3">
            <Image width={23} height={30} alt="" src="/MoreInfo.png" />
            Representative Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <h3>Full Name</h3>
              <input
                type="text"
                placeholder="Enter full legal name"
                className="p-2 mt-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <h3>Position/Role</h3>
              <input
                type="text"
                placeholder="e.g. Executive Director"
                className="p-2 mt-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <h3>Phone Number</h3>
              <input
                type="tel"
                placeholder="+251 9..."
                className="p-2 mt-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <h3>Work Email</h3>
              <input
                type="email"
                placeholder="name@organization.com"
                className="p-2 mt-2 border border-gray-300 rounded w-full"
              />
            </div>
          </div>
        </section>

        {/* Identity Verification */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[#062E2210] pb-4 mb-4 flex items-center gap-3">
            <Image width={23} height={20} alt="" src="/repst3.png" />
            Identity Verification
          </h2>
          <h3>Select Type</h3>
          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4">
            {['national', 'kebele', 'passport'].map((type) => (
              <button
                key={type}
                type="button"
                className={`flex-1 px-4 sm:px-14 py-2 rounded border text-center ${
                  idType === type ? 'bg-[#062E2240] border-gray-700' : 'border-gray-300'
                }`}
                onClick={() => {
                  setIdType(type as any);
                  setFormData((prev: any) => ({ ...prev, id_type: type }));
                }}
              >
                {type === 'national'
                  ? 'National ID'
                  : type === 'kebele'
                  ? 'Kebele ID'
                  : 'Passport'}
              </button>
            ))}
          </div>
          <div
            className="mt-4 border-2 border-dashed border-gray-300 rounded p-4 sm:p-6 text-center cursor-pointer"
            onClick={() => governmentIdRef.current?.click()}
          >
            <input
              ref={governmentIdRef}
              type="file"
              name="government_issued_id"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => updateFile("government_issued_id", e.target.files?.[0] || null)}
            />
            <p>Upload Government ID (PDF, JPG, max 5MB)</p>
            {formData.government_issued_id && (
              <p className="mt-2 text-sm text-gray-600">{formData.government_issued_id.name}</p>
            )}
          </div>
        </section>

        {/* Workspace ID */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[#062E2210] pb-4 mb-4 flex items-center gap-3">
            <Image width={23} height={20} alt="" src="/Badge.png" />
            Workspace ID
          </h2>
          <p className="text-sm text-gray-500">Please upload your workspace ID</p>
          <div
            className="mt-4 border-2 border-dashed border-gray-300 rounded p-4 sm:p-6 text-center cursor-pointer"
            onClick={() => workspaceIdRef.current?.click()}
          >
            <input
              ref={workspaceIdRef}
              type="file"
              name="workspace_id"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => updateFile("workspace_id", e.target.files?.[0] || null)}
            />
            <p>Upload Workspace ID (PDF, JPG, max 5MB)</p>
            {formData.workspace_id && (
              <p className="mt-2 text-sm text-gray-600">{formData.workspace_id.name}</p>
            )}
          </div>
        </section>

        {/* Authorization Proof */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[#062E2210] pb-4 mb-4 flex items-center gap-3">
            <Image width={23} height={20} alt="" src="/auth3.png" />
            Authorization Proof
          </h2>
          <p className="text-sm text-gray-500">
            Please upload a formal letter on organization letterhead, signed and stamped,
            authorizing you to act as the primary contact.
          </p>
          <div
            className="mt-2 border-2 border-dashed border-gray-300 rounded p-4 sm:p-6 text-center cursor-pointer"
            onClick={() => authLetterRef.current?.click()}
          >
            <input
              ref={authLetterRef}
              type="file"
              name="authorization_letter"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => updateFile("authorization_letter", e.target.files?.[0] || null)}
            />
            <p>Upload Authorization Letter</p>
            {formData.authorization_letter && (
              <p className="mt-2 text-sm text-gray-600">{formData.authorization_letter.name}</p>
            )}
          </div>
        </section>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
          <button
            type="button"
            onClick={backStep}
            className="px-4 py-2 border rounded-lg text-[#062E22] hover:bg-gray-100 w-full sm:w-auto"
          >
            Back
          </button>
          <button
            type="submit"
            onClick={nextStep}
            className="px-4 py-2 bg-[#062E22] text-white rounded-lg hover:bg-green-800 w-full sm:w-auto"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
