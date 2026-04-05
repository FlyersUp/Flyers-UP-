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
    <div className="flex min-w-0 max-w-full flex-col gap-3">
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
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={disabled || saving}
          showArrow={false}
          className="w-full min-w-0 max-w-full sm:w-auto"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
