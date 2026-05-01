'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const CATEGORY_OPTIONS = [
  'Venue Provider',
  'Catering Provider',
  'Decor',
  'Audio / Visual',
  'Security',
  'Photography',
];

interface ImagePreview {
  id: string;
  src: string;
  name: string;
  isNew: boolean;
}

interface ServiceFormState {
  title: string;
  description: string;
  category: string;
  price_min: string;
  price_max: string;
  pricing_type: 'fixed' | 'negotiable';
  location: string;
  tags: string;
  image_urls: string;
  availability: string;
}

interface ServiceFormProps {
  form: ServiceFormState;
  onChange: (field: string, value: string | 'fixed' | 'negotiable') => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  isEdit: boolean;
  success: string | null;
  error: string | null;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function ServiceForm({
  form,
  onChange,
  onSubmit,
  saving,
  isEdit,
  success,
  error,
  files,
  onFilesChange,
}: ServiceFormProps) {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const urls = form.image_urls.split(',').map((u) => u.trim()).filter(Boolean);
    const existingPreviews: ImagePreview[] = urls.map((url) => ({
      id: `existing-${url}`,
      src: url,
      name: url.includes('data:') ? 'uploaded-image' : url.split('/').pop() || 'image',
      isNew: false,
    }));
    const newPreviews: ImagePreview[] = files.map((file) => ({
      id: `new-${file.name}-${Date.now()}`,
      src: URL.createObjectURL(file),
      name: file.name,
      isNew: true,
    }));
    setPreviews([...existingPreviews, ...newPreviews]);

    return () => {
      newPreviews.forEach((p) => URL.revokeObjectURL(p.src));
    };
  }, [form.image_urls, files]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const maxSize = 5 * 1024 * 1024;
    const oversized = selected.find((f) => f.size > maxSize);
     if (oversized) {
       setToast({ message: `"${oversized.name}" exceeds the 5MB limit. Please choose a smaller image.`, type: 'error' });
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
     }

    onFilesChange([...files, ...selected]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const preview = previews.find(p => p.id === id);
    if (!preview) return;

    const newPreviewList = previews.filter((p) => p.id !== id);
    setPreviews(newPreviewList);

    if (preview.isNew) {
      const fileIndex = files.findIndex((f) => {
        const tempUrl = URL.createObjectURL(f);
        const isMatch = tempUrl === preview.src;
        URL.revokeObjectURL(tempUrl);
        return isMatch;
      });
      if (fileIndex > -1) {
        const updatedFiles = [...files];
        updatedFiles.splice(fileIndex, 1);
        onFilesChange(updatedFiles);
      }
    } else {
      const urls = form.image_urls.split(',').map((u) => u.trim()).filter(Boolean);
      const urlIndex = urls.indexOf(preview.src);
      if (urlIndex > -1) urls.splice(urlIndex, 1);
      onChange('image_urls', urls.join(', '));
    }
  };

  const hasImages = previews.length > 0;

  return (
    <>
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">
          {isEdit ? 'Edit' : 'Publish'} a service
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#062E22]">
          {isEdit ? 'Edit vendor offering' : 'Create a new vendor offering'}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Services you add here become the basis for organizer requests. Keep the scope and pricing clear so the request and contract flow stays easy to negotiate.
        </p>

        {success && (
          <div className="mb-4 mt-4 rounded-lg bg-green-50 text-green-700 px-4 py-2 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 mt-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
              Service title
            </label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              placeholder="Venue Provider - Premium Hall Package"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              placeholder="Describe the service scope, delivery style, capacity, and what the organizer receives."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => onChange('category', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-slate-700">
                Service location
              </label>
              <input
                id="location"
                required
                value={form.location}
                onChange={(e) => onChange('location', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                placeholder="Addis Ababa"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="price_min" className="mb-1 block text-sm font-medium text-slate-700">
                Minimum price
              </label>
              <input
                id="price_min"
                type="number"
                required
                min={0}
                value={String(form.price_min)}
                onChange={(e) => onChange('price_min', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              />
            </div>
            <div>
              <label htmlFor="price_max" className="mb-1 block text-sm font-medium text-slate-700">
                Maximum price
              </label>
              <input
                id="price_max"
                type="number"
                required
                min={0}
                value={String(form.price_max)}
                onChange={(e) => onChange('price_max', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              />
            </div>
            <div>
              <label htmlFor="pricing_type" className="mb-1 block text-sm font-medium text-slate-700">
                Pricing type
              </label>
              <select
                id="pricing_type"
                value={form.pricing_type}
                onChange={(e) => onChange('pricing_type', e.target.value as 'fixed' | 'negotiable')}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              >
                <option value="negotiable">Negotiable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="mb-1 block text-sm font-medium text-slate-700">
              Tags
            </label>
            <input
              id="tags"
              value={form.tags}
              onChange={(e) => onChange('tags', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              placeholder="premium, conference, indoor, large-capacity"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Images</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer transition hover:border-[#062E22] hover:bg-[#062E22]/[0.02]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-[#062E22]">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-400">PNG, JPG, WEBP — max 5MB each</p>
            </div>

            {hasImages && (
              <div className="mt-3 flex flex-wrap gap-3">
                {previews.map((preview) => (
                  <div key={preview.id} className="relative group">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                      <Image
                        src={preview.src}
                        alt={preview.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(preview.id);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="availability" className="mb-1 block text-sm font-medium text-slate-700">
              Availability notes or JSON
            </label>
            <textarea
              id="availability"
              rows={4}
              value={form.availability || ''}
              onChange={(e) => onChange('availability', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
              placeholder='{"days":["Mon","Tue"],"lead_time":"14 days"}'
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (isEdit ? 'Updating service...' : 'Publishing service...') : (isEdit ? 'Update Service' : 'Publish Service')}
          </button>
        </form>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </>
  );
}
