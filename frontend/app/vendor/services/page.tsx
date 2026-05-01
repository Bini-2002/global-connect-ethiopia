'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService, { updateService, deleteService } from '@/app/services/vendorPortalService';
import {
  VendorServiceCreatePayload,
  VendorServiceRecord,
} from '@/app/types/marketplace';
import Image from 'next/image';
import ServiceModal from '@/components/vendor/ServiceModal';
import ServiceCard from '@/components/vendor/ServiceCard';

const initialFormState = {
  title: '',
  description: '',
  category: 'Venue Provider',
  price_min: '50000',
  price_max: '120000',
  pricing_type: 'negotiable' as 'fixed' | 'negotiable',
  location: 'Addis Ababa',
  tags: '',
  image_urls: '',
  availability: '',
};

export default function Services() {
  const [services, setServices] = useState<VendorServiceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<VendorServiceRecord | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const data = await vendorPortalService.getMyServices();
      setServices(data);
      const elapsed = Date.now() - startTime;
      console.log(`Loaded ${data.length} services in ${elapsed}ms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

   useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleFormChange = (field: string, value: string | 'fixed' | 'negotiable') => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const existingImageUrls = form.image_urls
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)
        .filter((url) => !url.startsWith('data:'));

      let resultService: VendorServiceRecord | undefined;

      if (editingService) {
        resultService = await updateService(editingService.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          price_min: Number(form.price_min),
          price_max: Number(form.price_max),
          pricing_type: form.pricing_type,
          location: form.location.trim(),
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          images: existingImageUrls,
          availability: form.availability.trim() || undefined,
          files: files.length > 0 ? files : undefined,
        });
        setSuccess('Service updated successfully!');
        setServices(prev => prev.map(s => s.id === resultService!.id ? resultService! : s));
      } else {
        resultService = await vendorPortalService.createService({
          payload: {
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            price_min: Number(form.price_min),
            price_max: Number(form.price_max),
            pricing_type: form.pricing_type,
            location: form.location.trim(),
            tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
            image_urls: existingImageUrls.length > 0 ? existingImageUrls : undefined,
            availability: form.availability.trim() || undefined,
          },
          files: files.length > 0 ? files : undefined,
        });
        setSuccess('Service created successfully!');
        setServices(prev => [resultService!, ...prev]);
      }

      setForm(initialFormState);
      setFiles([]);
      setEditingService(null);

      setTimeout(() => {
        setShowModal(false);
        setSuccess(null);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: VendorServiceRecord) => {
    setEditingService(service);

    const imageUrls = (service.images || [])
      .map((img) => (typeof img === 'string' ? img : img.url || ''))
      .filter(Boolean)
      .join(', ');

    setForm({
      title: service.title || '',
      description: service.description || '',
      category: service.category || 'Venue Provider',
      price_min: String(service.price_min || ''),
      price_max: String(service.price_max || ''),
      pricing_type: service.pricing_type || 'negotiable',
      location: service.location || '',
      tags: service.tags?.join(', ') || '',
      image_urls: imageUrls,
      availability: typeof service.availability === 'string' ? service.availability : '',
    });
    setFiles([]);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteService(deleteConfirmId);
      setSuccess('Service deleted successfully');
      setServices(prev => prev.filter(s => s.id !== deleteConfirmId));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter((service) =>
      [service.title, service.category, service.location, service.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, services]);

  return (
    <div className="min-h-screen">
      
      <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
        <Image src="/Ellipse2.png" alt="" width={200} height={400} className="opacity-80" />
      </div>
      <div className="fixed bottom-6 right-0 -z-10 pointer-events-none">
        <Image src="/Ellipse3.png" alt="" width={200} height={400} className="opacity-80" />
      </div>
      <Sidebar role="vendor" />

      <DashboardHeader
        searchPlaceholder="Search your services..."
        onSearch={setSearchQuery}
        actionHref="/vendor/requests"
        actionLabel="View Requests"
      />

      <main className="pt-26 md:ml-60 p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#062E22]">Your Services</h1>

          <button
            onClick={() => {
              setEditingService(null);
              setForm(initialFormState);
              setFiles([]);
              setShowModal(true);
            }}
            className="bg-[#062E22] text-white px-4 py-2 rounded-xl"
          >
            + Create Service
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 font-medium underline whitespace-nowrap">Dismiss</button>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between">
            <h2 className="text-xl font-bold text-[#062E22]">Your published services</h2>
            <span>{filteredServices.length} items</span>
          </div>

          {loading ? (
            <div className="mt-5 grid md:grid-cols-2 gap-5">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 rounded-[28px] bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="mt-8 text-center text-gray-400">
              <p className="text-lg">No services yet</p>
              <p className="text-sm mt-1">Click "Create Service" to add your first offering</p>
            </div>
          ) : (
            <div className="mt-5 grid md:grid-cols-2 gap-5">
              {filteredServices.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  priority={index < 2}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ServiceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingService={editingService}
        form={form}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        saving={saving}
        success={success}
        error={error}
        files={files}
        onFilesChange={setFiles}
      />

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[#062E22] mb-2">Delete Service</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this service? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
