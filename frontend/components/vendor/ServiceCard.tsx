'use client';

import Image from 'next/image';
import { ServiceImageAsset, VendorServiceRecord } from '@/app/types/marketplace';

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return 'N/A';
  return `ETB ${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(value)}`;
}

function getImageUrl(images?: ServiceImageAsset[]): string | null {
  if (!images || images.length === 0) return null;
  const first = images[0];
  return typeof first === 'string' ? first : first.url;
}

interface ServiceCardProps {
  service: VendorServiceRecord;
  onEdit: (service: VendorServiceRecord) => void;
  onDelete: (id: string) => void;
  priority?: boolean;
}

export default function ServiceCard({ service, onEdit, onDelete, priority }: ServiceCardProps) {
  const imageUrl = getImageUrl(service.images);

  if (imageUrl) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col sm:flex-row">
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#062E22]">
              {service.title}
            </h3>
            <span className="inline-block mt-1 text-xs font-medium bg-[#062E22]/10 text-[#062E22] px-2 py-0.5 rounded-full">
              {service.category}
            </span>
            <p className="text-sm text-gray-500 mt-3 line-clamp-2">{service.description}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {service.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                  {tag}
                </span>
              ))}
              {service.tags.length > 4 && (
                <span className="text-xs text-slate-400">+{service.tags.length - 4}</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium text-[#062E22]">
              {formatCurrency(service.price_min)}{service.pricing_type === 'fixed' ? '' : ` – ${formatCurrency(service.price_max)}`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(service)}
                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(service.id)}
                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="sm:w-[40%] w-full p-3 ">
          <div className="relative w-full h-[220px] sm:h-full min-h-[220px] rounded-xl overflow-hidden">
            <Image
              src={imageUrl}
              alt={service.title}
              fill
              sizes="(max-width: 768px) 100vw, 20vw"
              className="object-cover"
           
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="p-5">
        <h3 className="text-lg font-bold text-[#062E22]">
          {service.title}
        </h3>
        <span className="inline-block mt-1 text-xs font-medium bg-[#062E22]/10 text-[#062E22] px-2 py-0.5 rounded-full">
          {service.category}
        </span>
        <p className="text-sm text-gray-500 mt-3 line-clamp-3">{service.description}</p>

        <div className="flex gap-2 mt-3 flex-wrap">
          {service.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
              {tag}
            </span>
          ))}
          {service.tags.length > 5 && (
            <span className="text-xs text-slate-400">+{service.tags.length - 5}</span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm font-medium text-[#062E22]">
            {formatCurrency(service.price_min)}{service.pricing_type === 'fixed' ? '' : ` – ${formatCurrency(service.price_max)}`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(service)}
              className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(service.id)}
              className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
