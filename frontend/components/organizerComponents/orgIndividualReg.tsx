import React, { useRef } from 'react'
import Image from 'next/image'
import { Props } from '@/app/types/types'

export default function OrgIndividualReg({formData, setFormData,handleChange,handleFileUpload,handleSubmit,handleDrop}:Props ) {
  const nationalIdRef = useRef<HTMLInputElement | null>(null);
  const governmentIdRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
           <label className=" block text-sm font-medium text-slate-700 mb-1">Profession /Role <span className='text-orange-600'>*</span></label>
           <input
             type="text"
             name="profession"
             placeholder="eg Freelance Event Planner "
             value={formData.profession}
             onChange={handleChange}
             className="w-full  border  border-slate-300 rounded-lg p-2"
             required
           />
   

   
           {/* Personal bio */}
           <label className=" block text-sm font-medium text-slate-700 mb-1">Personal Bio</label>
           <textarea
             name="personal_bio"
             placeholder="Share your professional background and interest in Global Connect..."
             value={formData.personal_bio}
             onChange={handleChange}
             className="w-full border border-slate-300 rounded-lg p-2"
             rows={4}
           />
              {/* social media */}
              <label className=" block text-sm font-medium text-slate-700 mb-1">Social Media/ Portfolio Link</label>
           <input
             type="url"
             name="social_media_link"
             placeholder="LinkedIn, Portfolio, or personal website"
             value={formData.social_media_link}
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
        name="prior_experience"
        value="yes"
        checked={formData.prior_experience === "yes"}
        onChange={(e) =>
          setFormData((prev: any) => ({
            ...prev,
            prior_experience: e.target.value,
          }))
        }
        className="w-4 h-4"
      />
      <span>Yes, I have hosted events before</span>
    </label>

    <label className="inline-flex items-center gap-2">
      <input
        type="radio"
        name="prior_experience"
        value="no"
        checked={formData.prior_experience === "no"}
        onChange={(e) =>
          setFormData((prev: any) => ({
            ...prev,
            prior_experience: e.target.value,
          }))
        }
        className="w-4 h-4"
      />
      <span>No, I am new to this</span>
    </label>
  </div>
           {/* File Upload */}
           <label className=" block text-sm font-medium text-slate-700 mb-1"> National ID/ Passport Verification <span className='text-orange-600'>*</span></label>
           <div
             className="border-dashed border-2 border-gray-300 rounded-lg p-4 justify-center items-center text-center cursor-pointer"
             onClick={() => nationalIdRef.current?.click()}
             onDrop={(e) => handleDrop?.(e, "national_id")}
             onDragOver={(e) => e.preventDefault()}
           >
             <input
               ref={nationalIdRef}
               type="file"
               name="national_id" 
               accept=".pdf,.jpg,.jpeg,.png,.webp"
               onChange={handleFileUpload}
               className="hidden"
               id="national_id"
             />
             <div className="flex flex-col justify-center items-center p-3">
             <Image src='/icon.png' width={30} height={30} alt=''/>
             <label htmlFor="national_id" className="cursor-pointer mt-5">
               Click to upload or drag and drop PDF, JPG, or PNG (max. 5MB)
             </label>
             {formData.national_id && (
               <p className="text-sm text-gray-600 mt-2">{formData.national_id.name}</p>
             )}</div>
           </div>
           <label className=" block text-sm font-medium text-slate-700 mb-1"> Government Issued ID <span className='text-orange-600'>*</span></label>
           <div
             className="border-dashed border-2 border-gray-300 rounded-lg p-4 justify-center items-center text-center cursor-pointer"
             onClick={() => governmentIdRef.current?.click()}
             onDrop={(e) => handleDrop?.(e, "government_issued_id")}
             onDragOver={(e) => e.preventDefault()}
           >
             <input
               ref={governmentIdRef}
               type="file"
               name="government_issued_id" 
               accept=".pdf,.jpg,.jpeg,.png,.webp"
               onChange={handleFileUpload}
               className="hidden"
               id="government_issued_id"
             />
             <div className="flex flex-col justify-center items-center p-3">
             <Image src='/icon.png' width={30} height={30} alt=''/>
             <label htmlFor="government_issued_id" className="cursor-pointer mt-5">
               Click to upload or drag and drop PDF, JPG, or PNG (max. 5MB)
             </label>
             {formData.government_issued_id && (
               <p className="text-sm text-gray-600 mt-2">{formData.government_issued_id.name}</p>
             )}</div>
           </div> </>
  )
}
