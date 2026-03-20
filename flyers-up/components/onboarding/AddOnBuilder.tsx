'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus, Trash2 } from 'lucide-react';

export type AddOnDraft = {
  id: string;
  title: string;
  priceDollars: string;
  description: string;
  isActive: boolean;
};

const MAX_ADDONS = 4;

interface AddOnBuilderProps {
  addons: AddOnDraft[];
  onChange: (addons: AddOnDraft[]) => void;
  disabled?: boolean;
  error?: string;
  /** When true, shows compact inline form for adding during onboarding */
  compact?: boolean;
}

function generateId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AddOnBuilder({
  addons,
  onChange,
  disabled = false,
  error,
  compact = false,
}: AddOnBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<AddOnDraft>({
    id: '',
    title: '',
    priceDollars: '',
    description: '',
    isActive: true,
  });

  const activeCount = addons.filter((a) => a.isActive).length;
  const maxReached = activeCount >= MAX_ADDONS;

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      priceDollars: '',
      description: '',
      isActive: true,
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const validate = (d: AddOnDraft): string | null => {
    const title = d.title.trim();
    if (!title) return 'Name is required.';
    const price = parseFloat(d.priceDollars);
    if (Number.isNaN(price) || price < 0) return 'Price must be 0 or greater.';
    const dup = addons.find((a) => a.id !== d.id && a.title.trim().toLowerCase() === title.toLowerCase());
    if (dup) return 'You already have an add-on with this name.';
    return null;
  };

  const handleSave = () => {
    const err = validate(formData);
    if (err) return;
    const price = parseFloat(formData.priceDollars);
    const normalized = { ...formData, title: formData.title.trim(), priceDollars: String(price >= 0 ? price : 0) };
    if (editingId) {
      onChange(
        addons.map((a) => (a.id === editingId ? { ...normalized, id: a.id } : a))
      );
    } else {
      onChange([...addons, { ...normalized, id: generateId() }]);
    }
    resetForm();
  };

  const handleRemove = (id: string) => {
    onChange(addons.filter((a) => a.id !== id));
    if (editingId === id) resetForm();
  };

  const startEdit = (a: AddOnDraft) => {
    setFormData({
      id: a.id,
      title: a.title,
      priceDollars: a.priceDollars,
      description: a.description,
      isActive: a.isActive,
    });
    setEditingId(a.id);
    setIsAdding(false);
  };

  const startAdd = () => {
    setFormData({
      id: '',
      title: '',
      priceDollars: '',
      description: '',
      isActive: true,
    });
    setEditingId(null);
    setIsAdding(true);
  };

  const formContent = (
    <div className="space-y-3">
      <Input
        label="Name"
        placeholder="e.g., Deep Cleaning, Window Washing"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <Input
        label="Price ($)"
        type="number"
        step="0.01"
        min="0"
        placeholder="19.99"
        value={formData.priceDollars}
        onChange={(e) => setFormData({ ...formData, priceDollars: e.target.value })}
      />
      <Input
        label="Description (optional)"
        placeholder="Brief description of this add-on"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      {!compact && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded border-border"
          />
          <span className="text-text2">Active (visible to customers)</span>
        </label>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={disabled}>
          {editingId ? 'Save' : 'Add'}
        </Button>
        <Button variant="ghost" onClick={resetForm}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text2">Add-ons</span>
        <span className="text-xs text-muted">
          {activeCount} / {MAX_ADDONS} active
        </span>
      </div>

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {addons.length > 0 && (
        <div className="space-y-2">
          {addons.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border p-3 ${
                editingId === a.id ? 'border-accent bg-accent/5' : 'border-border bg-surface'
              }`}
            >
              {editingId === a.id ? (
                formContent
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{a.title}</p>
                    <p className="text-sm text-muted">${a.priceDollars || '0'}</p>
                    {a.description && (
                      <p className="text-xs text-muted mt-1">{a.description}</p>
                    )}
                    {!compact && (
                      <span
                        className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                          a.isActive ? 'bg-accent/15 text-accent' : 'bg-surface2 text-muted'
                        }`}
                      >
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  {!disabled && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" onClick={() => startEdit(a)} className="px-3 py-1.5 text-sm">
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemove(a.id)}
                        className="text-danger hover:text-danger px-3 py-1.5 text-sm"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(isAdding || (addons.length === 0 && !editingId)) && (
        <div className="rounded-xl border border-dashed border-border p-4">
          {compact && addons.length === 0 && !isAdding ? (
            <button
              type="button"
              onClick={startAdd}
              disabled={disabled || maxReached}
              className="w-full py-2 text-sm text-muted hover:text-text flex items-center justify-center gap-2"
            >
              <Plus className="size-4" />
              Add your first add-on (optional)
            </button>
          ) : (
            formContent
          )}
        </div>
      )}

      {!isAdding && addons.length > 0 && !editingId && !maxReached && (
        <Button
          variant="ghost"
          onClick={startAdd}
          disabled={disabled}
          className={compact ? 'w-full py-2 text-sm' : ''}
        >
          <Plus className="size-4 mr-1" />
          {compact ? 'Add another add-on (optional)' : 'Add another add-on'}
        </Button>
      )}
    </div>
  );
}
