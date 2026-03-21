import React from "react";
import { Props } from "@/app/types/types";

export default function Step4OrgReg({
  formData,
  setFormData,
  handleChange,
  nextStep,
  backStep,
}: Props) {
  // Checkbox handler
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  return (
    <div className="max-w-3xl w-full bg-[#8CB98820] rounded-2xl shadow-xl p-8 border border-slate-200">
      {/* Progress Header */}
      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-sm font-semibold text-amber-600 mb-2">STEP 4 OF 4</h2>
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold text-[#062E22]">Confirm & Contact</h1>
          <span className="text-xs">100% Completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-5">
          <div className="bg-[#062E22] h-2 rounded-full" style={{ width: "100%" }} />
        </div>
        <span>Please provide contact info and confirm your details.</span>
      </div>

      {/* Form */}
      <form className="space-y-6">
        {/* Organization Contact */}
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Organization Contact <span className="text-orange-600">*</span>
        </label>
        <input
          type="text"
          name="organization_contact"
          placeholder="Enter primary contact number"
          value={formData.organization_contact || ""}
          onChange={handleChange}
          required
          className="w-full border border-slate-300 rounded-lg p-2"
        />

        {/* Alternative Contact */}
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Alternative Contact
        </label>
        <input
          type="text"
          name="alternative_contact"
          placeholder="Enter alternative number (optional)"
          value={formData.alternative_contact || ""}
          onChange={handleChange}
          className="w-full border border-slate-300 rounded-lg p-2"
        />

        {/* Confirm Information */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="confirm_information_is_accurate"
            checked={formData.confirm_information_is_accurate || false}
            onChange={handleCheckboxChange}
            required
          />
 <p className="text-sm text-gray-700">
            I hereby declare that all information provided is accurate and verified to the best of my knowledge. 
          </p>
        </div>

        {/* Agree Terms */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="agree_terms_and_privacy"
            checked={formData.agree_terms_and_privacy || false}
            onChange={handleCheckboxChange}
            required
          />
          <label className="text-sm text-slate-700">
            I agree to the Terms of Service and Privacy Policy <span className="text-orange-600">*</span>
          </label>
        </div>
        <p className="text-sm text-gray-600">
          Your account will be reviewed by our compliance team within 24–48 hours. You will receive an email notification once verified.
        </p>

        {/* Buttons */}
        <div className="flex justify-between mt-4">
          <button
            type="button"
            className="px-4 py-2 border rounded-lg text-[#062E22] hover:bg-gray-100"
            onClick={backStep}
          >
            Back
          </button>
          <button
            type="button"
            onClick={nextStep} // can replace with submission later
            className="px-4 py-2 bg-[#062E22] text-white rounded-lg hover:bg-green-800"
          >
            Submit Registration
          </button>
        </div>
      </form>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-gray-600">
        <p>© 2024 Global Connect Ethiopia. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Support Center</a>
          <a href="#">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}