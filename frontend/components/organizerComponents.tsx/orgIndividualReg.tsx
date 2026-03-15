import React from 'react'
import Image from 'next/image'
import { Props } from '@/app/types/types'

export default function OrgIndividualReg({formData, setFormData,handleChange,handleFileUpload,handleSubmit,handleDrop}:Props ) {
  return (
    <>
           <label className=" block text-sm font-medium text-slate-700 mb-1">Profession /Role</label>
           <input
             type="text"
             name="orgName"
             placeholder="eg Freelance Event Planner "
             value={formData.orgName}
             onChange={handleChange}
             className="w-full  border  border-slate-300 rounded-lg p-2"
             required
           />
   

   
           {/* Personal bio */}
           <label className=" block text-sm font-medium text-slate-700 mb-1">Personal Bio</label>
           <textarea
             name="description"
             placeholder="Share your professional background and interest in Global Connect..."
             value={formData.description}
             onChange={handleChange}
             className="w-full border border-slate-300 rounded-lg p-2"
             rows={4}
           />
              {/* social media */}
              <label className=" block text-sm font-medium text-slate-700 mb-1">Social Media/ Portfolio Link</label>
           <input
             type="url"
             name="website"
             placeholder="LinkedIn, Portfolio, or personal website"
             value={formData.website}
             onChange={handleChange}
             className="w-full border border-slate-300 rounded-lg p-2"
           /> 
           {/*host before */}
           <span className="block text-sm font-medium text-slate-700 mb-1">
    Have you hosted events before?
  </span>
  <div className="flex gap-6">
    <label className="inline-flex items-center gap-2">
      <input
        type="radio"
        name="hostedEventsBefore"
        value="yes"
        checked={formData.hostedEventsBefore === "yes"}
        onChange={(e) =>
          setFormData((prev: any) => ({
            ...prev,
            hostedEventsBefore: e.target.value,
          }))
        }
        className="w-4 h-4"
      />
      <span>Yes, I have hosted events before</span>
    </label>

    <label className="inline-flex items-center gap-2">
      <input
        type="radio"
        name="hostedEventsBefore"
        value="no"
        checked={formData.hostedEventsBefore === "no"}
        onChange={(e) =>
          setFormData((prev: any) => ({
            ...prev,
            hostedEventsBefore: e.target.value,
          }))
        }
        className="w-4 h-4"
      />
      <span>No, I am new to this</span>
    </label>
  </div>
           {/* File Upload */}
           <label className=" block text-sm font-medium text-slate-700 mb-1"> National ID/ Passport Verification</label>
           <div className="border-dashed border-2 border-gray-300 rounded-lg p-4 justify-center items-center text-center"
           onDrop={handleDrop}                
           onDragOver={(e) => e.preventDefault()}>
             <input
               type="file"
               name="NationalID" 
               accept=".pdf,.jpg,.png"
               onChange={handleFileUpload}
               className="hidden"
               id="NationalID"
             />
             <div className="flex flex-col justify-center items-center p-3">
             <Image src='/icon.png' width={30} height={30} alt=''/>
             <label htmlFor="NationalID" className="cursor-pointer mt-5">
               Click to upload or drag and drop PDF, JPG, or PNG (max. 5MB)
             </label>
             {formData.NationalID && (
               <p className="text-sm text-gray-600 mt-2">{formData.NationalID.name}</p>
             )}</div>
           </div> </>
  )
}
