'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';

export default function VendorVerificationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    business_name: '',
    business_category: '',
    business_address: '',
    registration_number: '',
    years_of_operation: '',
    website_url: '',
  });
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [govId, setGovId] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'business_category') {
      setMetadata({}); // Reset metadata when category changes
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMetadata(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessDoc || !govId) { setError('Both documents are required.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('category_metadata', JSON.stringify(metadata));
      fd.append('business_license_or_registration_certificate', businessDoc);
      fd.append('government_issued_id', govId);
      await api.post('/vendors/verification/step-2', fd);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Step 2 failed');
    } finally { setLoading(false); }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm1 || !confirm2) { setError('Please accept both declarations.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('confirm_information_is_accurate', 'true');
      fd.append('agree_terms_and_privacy', 'true');
      await api.post('/vendors/verification/step-3/submit', fd);
      setSuccess("Verification submitted! We'll review your application and notify you.");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally { setLoading(false); }
  };

  const CATEGORIES = [
    'Hotel', 'Catering', 'Decoring', 'Security', 'Audio Visual',
    'Social Media Promoting', 'Marketing and Advertisment',
    'Modeling and Hosts', 'Volunteer facilitator', 'Graphics Design'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <main className="w-full max-w-3xl animate-fade-in">
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#062E22]">Vendor Verification</h1>
            <p className="text-slate-500 text-sm mt-1">Complete your business verification to start offering services.</p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mb-8">
            {[
              { n: 1, label: 'Business Details' },
              { n: 2, label: 'Review & Submit' },
              { n: 3, label: 'Submitted' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? 'bg-[#062E22] text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className={`text-xs font-medium ${step >= s.n ? 'text-[#062E22]' : 'text-slate-400'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-[#062E22]' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleStep2Submit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
              <h2 className="font-semibold text-[#062E22]">Business Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Name <span className="text-red-500">*</span></label>
                  <input name="business_name" value={form.business_name} onChange={handleChange} required placeholder="Your business name"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition text-slate-800" />
                </div>
                <div>
                  <label htmlFor="business_category" className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select
                    id="business_category"
                    name="business_category"
                    value={form.business_category}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition text-slate-800"
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Years of Operation <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="years_of_operation"
                    value={form.years_of_operation}
                    onChange={handleChange}
                    required
                    min="0"
                    placeholder="Number of years"
                    title="Enter the number of years your business has been operating"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition text-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Address <span className="text-red-500">*</span></label>
                  <input name="business_address" value={form.business_address} onChange={handleChange} required placeholder="Full business address"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                  <input name="registration_number" value={form.registration_number} onChange={handleChange} placeholder="Business registration number"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Website URL</label>
                  <input name="website_url" value={form.website_url} onChange={handleChange} placeholder="https://"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition text-slate-800" />
                </div>
              </div>

              {form.business_category && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h2 className="font-semibold text-[#062E22]">{form.business_category} Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {form.business_category === 'Hotel' && (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Star Rating</label>
                          <input name="star_rating" type="number" min="1" max="5" value={metadata.star_rating || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., 4" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Total Rooms</label>
                          <input name="total_rooms" type="number" value={metadata.total_rooms || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., 120" />
                        </div>
                      </>
                    )}
                    {form.business_category === 'Catering' && (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Cuisine Specialties</label>
                          <input name="cuisines" value={metadata.cuisines || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Ethiopian, Italian" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Max Guest Capacity</label>
                          <input name="max_guests" type="number" value={metadata.max_guests || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., 1000" />
                        </div>
                      </>
                    )}
                    {form.business_category === 'Decoring' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Core Styles</label>
                        <input name="styles" value={metadata.styles || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Traditional, Modern, Corporate" />
                      </div>
                    )}
                    {form.business_category === 'Security' && (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Agency Type</label>
                          <input name="agency_type" value={metadata.agency_type || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Private Security" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Coverage Details</label>
                          <input name="insurance" value={metadata.insurance || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Fully Bonded and Insured" />
                        </div>
                      </>
                    )}
                    {form.business_category === 'Audio Visual' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Primary Focus</label>
                        <input name="primary_focus" value={metadata.primary_focus || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Sound, Lighting, Photography" />
                      </div>
                    )}
                    {form.business_category === 'Social Media Promoting' && (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Primary Platforms</label>
                          <input name="platforms" value={metadata.platforms || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., TikTok, Instagram" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Average Reach / Followers</label>
                          <input name="average_reach" value={metadata.average_reach || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., 50k" />
                        </div>
                      </>
                    )}
                    {form.business_category === 'Marketing and Advertisment' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Primary Channels</label>
                        <input name="channels" value={metadata.channels || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Billboard, Print, Radio, TV" />
                      </div>
                    )}
                    {form.business_category === 'Modeling and Hosts' && (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Total Talents Available</label>
                          <input name="total_talents" type="number" value={metadata.total_talents || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., 25" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Agency Portfolio Link</label>
                          <input name="portfolio_link" type="url" value={metadata.portfolio_link || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="https://" />
                        </div>
                      </>
                    )}
                    {form.business_category === 'Volunteer facilitator' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Typical Volunteer Base Size</label>
                        <input name="volunteer_base_size" type="number" value={metadata.volunteer_base_size || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., 100" />
                      </div>
                    )}
                    {form.business_category === 'Graphics Design' && (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Core Software Stack</label>
                          <input name="software_stack" value={metadata.software_stack || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Adobe CC, Figma" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio Link</label>
                          <input name="portfolio_link" type="url" value={metadata.portfolio_link || ''} onChange={handleMetadataChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="https://" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h2 className="font-semibold text-[#062E22]">Required Documents</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Business License / Registration Certificate <span className="text-red-500">*</span></label>
                  <div className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${businessDoc ? 'border-[#062E22] bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => document.getElementById('biz-doc')?.click()}>
                    {businessDoc ? (
                      <p className="text-sm font-medium text-green-700">✅ {businessDoc.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">Click to upload PDF, JPG, or PNG</p>
                        <p className="text-xs text-slate-400 mt-1">Max 10MB</p>
                      </>
                    )}
                    <input id="biz-doc" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" title="Upload business license or registration certificate" onChange={e => setBusinessDoc(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Government Issued ID <span className="text-red-500">*</span></label>
                  <div className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${govId ? 'border-[#062E22] bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => document.getElementById('gov-id')?.click()}>
                    {govId ? (
                      <p className="text-sm font-medium text-green-700">✅ {govId.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">Click to upload ID document</p>
                        <p className="text-xs text-slate-400 mt-1">Max 10MB</p>
                      </>
                    )}
                    <input id="gov-id" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" title="Upload government issued ID document" onChange={e => setGovId(e.target.files?.[0] || null)} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Continue to Review →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
              <h2 className="font-semibold text-[#062E22]">Review & Confirm</h2>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                {Object.entries({ 'Business Name': form.business_name, 'Category': form.business_category, 'Address': form.business_address, 'Years in Operation': form.years_of_operation }).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between"><span className="text-slate-500">Business Doc</span><span className="font-medium text-green-600">{businessDoc?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Government ID</span><span className="font-medium text-green-600">{govId?.name}</span></div>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'c1', label: 'I confirm that all information provided is accurate and complete.', val: confirm1, set: setConfirm1 },
                  { id: 'c2', label: 'I agree to the Terms of Service and Privacy Policy.', val: confirm2, set: setConfirm2 },
                ].map(c => (
                  <label key={c.id} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" id={c.id} checked={c.val} onChange={e => c.set(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#062E22]" />
                    <span className="text-sm text-slate-700">{c.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition">← Back</button>
                <button type="submit" disabled={loading || !confirm1 || !confirm2}
                  className="flex-1 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Submit for Verification
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center animate-scale-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-[#062E22] mb-2">Application Submitted!</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">{success}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
