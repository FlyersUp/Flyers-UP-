'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import type { PhotoCategory, PhotoEntry } from '@/lib/scopeLock/jobDetailsSchema';

export interface PhotoUploadGridProps {
  photos: PhotoEntry[];
  onChange: (photos: PhotoEntry[]) => void;
  /** Upload file to storage and return URL. If not provided, uses data URL (for small images). */
  onUpload?: (file: File, category: PhotoCategory) => Promise<string>;
  minRequired?: number;
  disabled?: boolean;
  errors?: string[];
}

const PHOTO_CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'main_room', label: 'Main room' },
  { id: 'problem_areas', label: 'Problem areas (optional)' },
];

export function PhotoUploadGrid({
  photos,
  onChange,
  onUpload,
  minRequired = 2,
  disabled,
  errors = [],
}: PhotoUploadGridProps) {
  const [uploading, setUploading] = useState(false);

  const addPhoto = useCallback(
    async (category: PhotoCategory, file: File) => {
      if (onUpload) {
        setUploading(true);
        try {
          const url = await onUpload(file, category);
          onChange([...photos, { category, url }]);
        } finally {
          setUploading(false);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          onChange([...photos, { category, url }]);
        };
        reader.readAsDataURL(file);
      }
    },
    [photos, onChange, onUpload]
  );

  const removePhoto = useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, category: PhotoCategory) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      addPhoto(category, file);
      e.target.value = '';
    },
    [addPhoto]
  );

  const triggerUpload = (category: PhotoCategory) => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleFileSelect(e as unknown as React.ChangeEvent<HTMLInputElement>, category);
    input.click();
  };

  const photosByCategory = PHOTO_CATEGORIES.map((cat) => ({
    ...cat,
    items: photos.filter((p) => p.category === cat.id),
  }));

  const totalCount = photos.length;
  const meetsMin = totalCount >= minRequired;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#2d3436] dark:text-white">
          Photos (min {minRequired} required)
        </p>
        {!meetsMin && totalCount > 0 && (
          <p className="text-xs text-amber-600">
            Add {minRequired - totalCount} more
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {photosByCategory.map((cat) => (
          <div
            key={cat.id}
            className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-white/12 dark:bg-[#14161c]"
          >
            <p className="mb-2 text-xs font-medium text-[#6B7280] dark:text-white/55">{cat.label}</p>
            <div className="space-y-2">
              {cat.items.map((p, idx) => {
                const globalIdx = photos.findIndex((x) => x === p);
                return (
                  <div key={globalIdx} className="relative aspect-video overflow-hidden rounded-lg bg-surface2 dark:bg-white/5">
                    <Image
                      src={p.url}
                      alt={cat.label}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removePhoto(globalIdx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white text-xs flex items-center justify-center hover:bg-red-600"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => triggerUpload(cat.id)}
                  disabled={uploading}
                  className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] text-[#6B7280] transition-colors hover:border-[#4A69BD] hover:text-[#4A69BD] disabled:opacity-50 dark:border-white/20 dark:text-white/50 dark:hover:border-[#4A69BD] dark:hover:text-[#7B93D6]"
                >
                  {uploading ? 'Uploading…' : '+ Add photo'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
