'use client';

import ServiceForm from './ServiceForm';
import { VendorServiceRecord } from '@/app/types/marketplace';

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

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingService: VendorServiceRecord | null;
  form: ServiceFormState;
  onFormChange: (field: string, value: string | 'fixed' | 'negotiable') => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  success: string | null;
  error: string | null;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function ServiceModal({
  isOpen,
  onClose,
  editingService,
  form,
  onFormChange,
  onSubmit,
  saving,
  success,
  error,
  files,
  onFilesChange,
}: ServiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-2xl p-6 rounded-2xl overflow-y-auto max-h-[90vh] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {editingService ? 'Edit Service' : 'Create Service'}
        </h2>

        <ServiceForm
          form={form}
          onChange={onFormChange}
          onSubmit={onSubmit}
          saving={saving}
          isEdit={!!editingService}
          success={success}
          error={error}
          files={files}
          onFilesChange={onFilesChange}
        />
      </div>
    </div>
  );
}
