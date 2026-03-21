import React from 'react'
import Image from 'next/image'
import { Props } from '@/app/types/types'


export default function OrgorgReg({formData, setFormData,handleChange,handleFileUpload,handleSubmit,handleDrop}: Props) {
  return (
    <>
          
      {/* Organization Name */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
      <input
        type="text"
        name="orgName"
        placeholder="Enter full legal name"
        value={formData.orgName}
        onChange={handleChange}
        className="w-full  border  border-slate-300 rounded-lg p-2"
        required
      />

      {/* Position / Title */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Position/ Title</label>
      <input
        type="text"
        name="position"
        placeholder="e.g. Event Manager, Director"
        value={formData.position}
        onChange={handleChange}
        className="w-full border border-slate-300 rounded-lg p-2"
      />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Organization Type */}
      <div>
      <label className=" block text-sm font-medium text-slate-700 mb-1">Organization Type</label>
      <select
        name="orgType"
        value={formData.orgType}
        onChange={handleChange}
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
      <label className=" block text-sm font-medium text-slate-700 mb-1">Industry</label>
      <select
        name="industry"
        value={formData.industry}
        onChange={handleChange}
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
      <label className=" block text-sm font-medium text-slate-700 mb-1">Organization size</label>
      <select
        name="companySize"
        value={formData.companySize}
        onChange={handleChange}
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
        name="website"
        placeholder="https://example.com"
        value={formData.website}
        onChange={handleChange}
        className="w-full border border-slate-300 rounded-lg p-2"
      />

      {/* Description */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Organization Description</label>
      <textarea
        name="description"
        placeholder="Briefly describe what your organization does..."
        value={formData.description}
        onChange={handleChange}
        className="w-full border border-slate-300 rounded-lg p-2"
        rows={4}
      />

      {/* File Upload */}
      <label className=" block text-sm font-medium text-slate-700 mb-1">Business License/ Registration Document</label>
      <div className="border-dashed border-2 border-gray-300 rounded-lg p-4 justify-center items-center text-center"
      onDrop={handleDrop}                 
      onDragOver={(e) => e.preventDefault()}>
        <input
          type="file"
          name="licenseFile" 
          accept=".pdf,.jpg,.png"
          onChange={handleFileUpload}
          className="hidden"
          id="licenseFile"
        />
        <div className="flex flex-col justify-center items-center p-3">
        <Image src='/icon.png' width={30} height={30} alt=''/>
        <label htmlFor="licenseFile" className="cursor-pointer mt-5">
          Click to upload or drag and drop PDF, JPG, or PNG (max. 5MB)
        </label>
        {formData.licenseFile && (
          <p className="text-sm text-gray-600 mt-2">{formData.licenseFile.name}</p>
        )}</div>
      </div> </>
  )
}
