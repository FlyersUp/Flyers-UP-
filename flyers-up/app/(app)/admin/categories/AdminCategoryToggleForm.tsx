'use client';

import { adminToggleCategoryPhase1Action } from '@/app/(app)/admin/_actions';

export function AdminCategoryToggleForm({
  categoryId,
  isActive,
}: {
  categoryId: string;
  isActive: boolean;
}) {
  return (
    <div className="flex gap-2">
      <form action={adminToggleCategoryPhase1Action} className="inline">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="active" value="true" />
        <button
          type="submit"
          disabled={isActive}
          className="text-xs font-medium px-2 py-1 rounded border border-accent/50 text-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Activate for Phase 1
        </button>
      </form>
      <form action={adminToggleCategoryPhase1Action} className="inline">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="active" value="false" />
        <button
          type="submit"
          disabled={!isActive}
          className="text-xs font-medium px-2 py-1 rounded border border-border text-muted hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Deactivate
        </button>
      </form>
    </div>
  );
}
