import React from 'react'
import Image from 'next/image';
import OrgIndividualReg from './orgIndividualReg';
import OrgorgReg from './OrgorgReg';
import { Props } from '@/app/types/types';

export default function Step2orgReg({formData, setFormData,handleChange,handleFileUpload,nextStep,handleSubmit,handleDrop}: Props) {

     const registerType =['Individual', 'Organization']
  return (
    <div><div className="max-w-3xl w-full bg-[#8CB98820] rounded-2xl shadow-xl p-8 border border-slate-200">
    {/* Progress Header */}
    <div className="w-full max-w-2xl mb-8">
      <h2 className="text-sm font-semibold text-amber-600 mb-2">STEP 2 OF 3</h2>
      <div className='flex justify-between'>
      <h1 className="text-2xl  font-bold text-[#062E22]">      {formData.registrationType=== "Organization" ? 'Organization Details':'Personal Details' }</h1>
      <span className='text-xs'>66% Completed</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-5">
        <div className="bg-[#062E22] h-2 rounded-full" style={{ width: "66%" }} />
      </div>
      {formData.registrationType=== "Organization" && (      <span>Tell us more about the organization you represent to help us personalize your experience.</span>)}
      {formData.registrationType=== "Individual" && (      <span>Tell us more about you represent to help us personalize your experience.{" "}{" "}{" "}{" "}</span>)}
    

    </div>

    {/* Form */}
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Registration Type */}
      <label className="block text-sm font-medium text-slate-700 mb-1"> I am registering as an:</label>
      <div className="flex gap-4">
      
        <div className="flex bg-[#F1F5F9] h-10 w-96 p-1 rounded-lg overflow-hidden">
      {registerType.map((lang) => {
        const isActive = formData.registrationType == lang;
        return (
          <button
            key={lang}
            onClick={(e) => {
                e.preventDefault();
                setFormData({ ...formData, registrationType: lang });
              }}
            className={`flex-1  font-bold flex justify-center items-center text-xs  transition-colors rounded-lg duration-200 ${
              isActive ? "bg-white text-[#062E22]" : "text-[#64748B]"
            }`}
          >
            {lang}
          </button>
        );
      })}
    </div>
 

      </div>

      {formData.registrationType=== "Organization" && (
         <OrgorgReg
         formData={formData}
          setFormData={setFormData}
          handleDrop={handleDrop}
          handleChange={handleChange}
          handleSubmit={handleSubmit} 
          handleFileUpload={handleFileUpload}/> )}
      {formData.registrationType === "Individual" && (
        <OrgIndividualReg 
        formData={formData}
        setFormData={setFormData}
        handleDrop={handleDrop}
        handleChange={handleChange}
        handleSubmit={handleSubmit} 
        handleFileUpload={handleFileUpload}
         />)
      }

      {/* Buttons */}
      <div className="flex justify-between mt-4">
        <button
          type="button"
          className="px-4 py-2 border rounded-lg text-[#062E22] hover:bg-gray-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 bg-[#062E22] text-white rounded-lg hover:bg-green-800"
        >
          Continue to Profile Details
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
    </footer></div></div>
  )
}
