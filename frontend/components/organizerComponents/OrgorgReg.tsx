import React, { useRef } from 'react'
import Image from 'next/image'
import { Props } from '@/app/types/types'


export default function OrgorgReg({formData, Error,handleChange,handleFileUpload,handleSubmit,handleDrop}: Props) {
  const businessLicenceRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
          
      {/* Organization Name */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Organization Name <span className='text-orange-600'>*</span></label>
      <input
        type="text"
        name="organization_name"
        placeholder="Enter full legal name"
        value={formData.organization_name}
        onChange={handleChange}
        className="w-full  border  border-slate-300 rounded-lg p-2"
        required
      />

      {/* Position / Title *
      <label className=" block text-sm font-medium text-slate-700 mb-1">Position/ Title<span className='text-orange-600'>*</span></label>
      <input
        type="text"
        name="position"
        placeholder="e.g. Event Manager, Director"
        value={formData.position}
        onChange={handleChange}
        required
        className="w-full border border-slate-300 rounded-lg p-2"
      /> */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Organization Type */}
      <div>
      <label htmlFor="organization_type" className=" block text-sm font-medium text-slate-700 mb-1">Organization Type <span className='text-orange-600'>*</span></label>
      <select
        id="organization_type"
        name="organization_type"
        value={formData.organization_type}
        onChange={handleChange}
        required
        className="w-full border border-slate-300 rounded-lg p-2"
      >
        <option value="">Select type</option>
        <option value="ngo">NGO</option>
        <option value="private">Private Company</option>
        <option value="government">Government</option>
      </select>
      </div>
      <div>
      {/* Industry */}
      <label htmlFor="field_of_study" className=" block text-sm font-medium text-slate-700 mb-1">Industry <span className='text-orange-600'>*</span></label>
      <select
        id="field_of_study"
        name="field_of_study"
        value={formData.field_of_study}
        onChange={handleChange}
        required
        className="w-full border border-slate-300 rounded-lg p-2"
      >
        <option value="">Select industry</option>
        <option value="tech">Technology</option>
        <option value="finance">Finance</option>
        <option value="health">Healthcare</option>
        <option value="education">Education</option>
      </select>
      </div></div>
      {/* Company Size */}
      <label htmlFor="employee_size" className=" block text-sm font-medium text-slate-700 mb-1">Organization size <span className='text-orange-600'>*</span></label>
      <select
        id="employee_size"
        name="employee_size"
        value={formData.employee_size}
        onChange={handleChange}
        required
        className="w-full border border-slate-300 rounded-lg p-2"
      >
        <option value="">Select size</option>
        <option value="1-10">1-10</option>
        <option value="11-50">11-50</option>
        <option value="51-200">51-200</option>
        <option value="201-500">201-500</option>
        <option value="500+">500+</option>
      </select>

      {/* Website */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Website URL</label>
      <input
        type="url"
        name="website_url"
        placeholder="https://example.com"
        value={formData.website_url}
        onChange={handleChange}
        className="w-full border border-slate-300 rounded-lg p-2"
      />

      {/* Description */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Organization Description</label>
      <textarea
        name="organization_description"
        placeholder="Briefly describe what your organization does..."
        value={formData.organization_description}
        onChange={handleChange}
        className="w-full border border-slate-300 rounded-lg p-2"
        rows={4}
      />

      {/* File Upload */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Business License/ Registration Document <span className='text-orange-600'>*</span></label>
      <div
        className="border-dashed border-2 border-gray-300 rounded-lg p-4 justify-center items-center text-center cursor-pointer"
        onClick={() => businessLicenceRef.current?.click()}
        onDrop={(e) => handleDrop?.(e, "business_licence")}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={businessLicenceRef}
          type="file"
          name="business_licence" 
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileUpload}
          className="hidden"
          id="business_licence"
        />
        <div className="flex flex-col justify-center items-center p-3">
        <Image src='/icon.png' width={30} height={30} alt=''/>
        <label htmlFor="business_licence" className="cursor-pointer mt-5">
          Click to upload or drag and drop PDF, JPG, or PNG (max. 5MB)
        </label>
        {formData.business_licence && (
          <p className="text-sm text-gray-600 mt-2">{formData.business_licence.name}</p>
        )}
        </div>
        {Error && <p className="text-red-600 text-sm mt-1">{Error}</p>}
      </div>
    </>
  )
}
