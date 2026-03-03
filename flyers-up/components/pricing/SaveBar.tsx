'use client';

import { Button } from '@/components/ui/Button';

interface SaveBarProps {
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
  success?: string | null;
  error?: string | null;
}

export function SaveBar({ onSave, saving, disabled, success, error }: SaveBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl text-text text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl text-text text-sm">
          {success}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={disabled || saving}
          showArrow={false}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
