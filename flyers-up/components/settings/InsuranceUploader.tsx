'use client';

import { useState, useRef } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';
import { StatusChip } from './StatusChip';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_SIZE_MB = 5;

interface InsuranceUploaderProps {
  currentPath: string | null;
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  onRemove: () => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
}

export function InsuranceUploader({
  currentPath,
  onUpload,
  onRemove,
  disabled,
}: InsuranceUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFile = Boolean(currentPath);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    const res = await onUpload(file);
    setUploading(false);
    if (!res.success) setError(res.error ?? 'Upload failed');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    const res = await onRemove();
    setUploading(false);
    if (!res.success) setError(res.error ?? 'Remove failed');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-text">Insurance proof</span>
        <StatusChip
          status={hasFile ? 'verified' : 'not_started'}
          label={hasFile ? 'Uploaded' : 'Not uploaded'}
        />
      </div>
      <p className="text-xs text-muted">
        Uploading insurance can improve customer trust. PDF, JPG, or PNG up to {MAX_SIZE_MB}MB.
      </p>

      {hasFile ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-black/10 bg-black/[0.02]">
          <FileCheck size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-text flex-1">Document uploaded</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={uploading}
              className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-colors"
              aria-label="Remove"
            >
              <X size={18} />
            </button>
          )}
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-black/10 bg-black/[0.02] cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors ${disabled || uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            disabled={disabled || uploading}
            className="hidden"
          />
          <Upload size={24} className="text-muted" />
          <span className="text-sm font-medium text-text">
            {uploading ? 'Uploading…' : 'Choose file (PDF, JPG, PNG)'}
          </span>
        </label>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
