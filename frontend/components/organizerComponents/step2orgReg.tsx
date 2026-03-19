import React from "react";
import OrgIndividualReg from "./orgIndividualReg";
import OrgorgReg from "./OrgorgReg";
import { Props } from "@/app/types/types";

export default function Step2orgReg({
  formData,
  setFormData,
  handleChange,
  handleFileUpload,
  handleDrop,
  nextStep,
  Error,
  handleSubmit,
}: Props) {
  const registerType = ["Individual", "Organization"];

  return (
    <div className="w-full flex justify-center p-4">
      <div className="max-w-3xl w-full bg-[#8CB98820] rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
        {/* Progress Header */}
        <div className="w-full max-w-full mb-6 sm:mb-8">
          <h2 className="text-sm font-semibold text-amber-600 mb-2">STEP 2 OF 4</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h1 className="text-2xl font-bold text-[#062E22] mb-2 sm:mb-0">
              {formData.registrationType === "Organization" ? "Organization Details" : "Personal Details"}
            </h1>
            <span className="text-xs">66% Completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-5">
            <div
              className="bg-[#062E22] h-2 rounded-full"
              style={{ width: "66%" }}
            />
          </div>
          <span className="text-sm block">
            {formData.registrationType === "Organization"
              ? "Tell us more about the organization you represent to help us personalize your experience."
              : "Tell us more about yourself to help us personalize your experience."}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Registration Type */}
          <label className="block text-sm font-medium text-slate-700 mb-1">
            I am registering as:
          </label>
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
            {registerType.map((type) => {
              const isActive = formData.registrationType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, registrationType: type })}
                  className={`flex-1 font-bold flex justify-center items-center text-xs transition-colors rounded-lg duration-200 px-4 py-2 min-w-[120px] ${
                    isActive ? "bg-white text-[#062E22]" : "text-[#64748B] bg-[#F1F5F9]"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Conditional Form */}
          {formData.registrationType === "Organization" ? (
            <OrgorgReg
              formData={formData}
              setFormData={setFormData}
              handleDrop={handleDrop}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              Error={Error}
              handleFileUpload={handleFileUpload}
            />
          ) : (
            <OrgIndividualReg
              formData={formData}
              setFormData={setFormData}
              handleDrop={handleDrop}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              handleFileUpload={handleFileUpload}
            />
          )}

          {/* Error Display */}
          {Error && <p className="text-red-500 text-sm mt-2">{Error}</p>}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 border rounded-lg text-[#062E22] hover:bg-gray-100 w-full sm:w-auto"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-[#062E22] text-white rounded-lg hover:bg-green-800 w-full sm:w-auto"
            >
              Continue to Profile Details
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-600">
          <p>© 2024 Global Connect Ethiopia. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Support Center</a>
            <a href="#">Contact Us</a>
          </div>
        </footer>
      </div>
    </div>
  );
}