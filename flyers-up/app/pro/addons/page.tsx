'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { getCurrentUser, getProByUserId, getProAddons, type ServiceAddon } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { createAddonAction, updateAddonAction, deleteAddonAction } from '@/app/actions/addons';
import { formatMoney, centsToDollars } from '@/lib/utils/money';
import Link from 'next/link';

/**
 * Pro Add-Ons Management Page
 * 
 * Allows pros to:
 * - View add-ons for their service category
 * - Create new add-ons (max 4 active per category)
 * - Edit add-on title/price
 * - Toggle add-ons active/inactive
 * - Delete add-ons
 */
export default function ProAddonsPage() {
  const [loading, setLoading] = useState(true);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [serviceCategory, setServiceCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state for creating/editing
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    priceDollars: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      if (!user || user.role !== 'pro') {
        setError('Unauthorized. Pro access required.');
        setLoading(false);
        return;
      }

      // Get pro's service category
      const pro = await getProByUserId(user.id);
      if (!pro) {
        setError('Pro profile not found.');
        setLoading(false);
        return;
      }

      setServiceCategory(pro.categorySlug);

      // Load add-ons for this category
      const addonsList = await getProAddons(user.id, pro.categorySlug);
      setAddons(addonsList);
    } catch (err) {
      console.error('Error loading add-ons:', err);
      setError('Failed to load add-ons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.priceDollars.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const price = parseFloat(formData.priceDollars);
      if (Number.isNaN(price) || price < 0) {
        setError('Price must be a valid number.');
        return;
      }
      const result = await createAddonAction(serviceCategory, formData.title.trim(), price, session?.access_token ?? undefined);
      if (!result.success) return setError(result.error || 'Failed to create add-on.');

      setSuccess('Add-on created successfully!');
      setIsCreating(false);
      setFormData({ title: '', priceDollars: '' });
      await loadData();
    } catch (err) {
      console.error('Error creating add-on:', err);
      setError('Failed to create add-on. Please try again.');
    }
  };

  const handleUpdate = async (addonId: string, updates: { title?: string; priceDollars?: number; isActive?: boolean }) => {
    try {
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const result = await updateAddonAction(addonId, updates, session?.access_token ?? undefined);
      if (!result.success) return setError(result.error || 'Failed to update add-on.');

      setSuccess('Add-on updated successfully!');
      setEditingId(null);
      setFormData({ title: '', priceDollars: '' });
      await loadData();
    } catch (err) {
      console.error('Error updating add-on:', err);
      setError('Failed to update add-on. Please try again.');
    }
  };

  const handleDelete = async (addonId: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) {
      return;
    }

    try {
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const result = await deleteAddonAction(addonId, session?.access_token ?? undefined);
      if (!result.success) return setError(result.error || 'Failed to delete add-on.');

      setSuccess('Add-on deleted successfully!');
      await loadData();
    } catch (err) {
      console.error('Error deleting add-on:', err);
      setError('Failed to delete add-on. Please try again.');
    }
  };

  const startEdit = (addon: ServiceAddon) => {
    setEditingId(addon.id);
    setFormData({
      title: addon.title,
      priceDollars: centsToDollars(addon.priceCents).toFixed(2),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ title: '', priceDollars: '' });
  };

  const activeCount = addons.filter(a => a.isActive).length;
  const maxActiveReached = activeCount >= 4;

  if (loading) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted/70">Loading add-ons...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/pro" className="text-sm text-muted hover:text-text">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3 mb-2">Add-Ons</h1>
          <Label>MANAGE ADD-ONS</Label>
          {serviceCategory && (
            <p className="text-sm text-muted mt-2">
              Service Category: <span className="font-medium">{serviceCategory}</span>
            </p>
          )}
          <p className="text-sm text-muted mt-1">Active add-ons: {activeCount} / 4</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-text text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-success/15 border border-success/30 rounded-lg text-text text-sm">
            {success}
          </div>
        )}

        {/* Create New Add-On Form */}
        {isCreating && (
          <Card withRail className="mb-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-text">Create New Add-On</h3>
              <Input
                label="Title"
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
              <div className="flex gap-3">
                <Button onClick={handleCreate}>Create Add-On</Button>
                <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Add-Ons List */}
        <div className="space-y-4">
          {addons.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-muted/70">
                <p className="mb-4">No add-ons yet.</p>
                {!isCreating && (
                  <Button onClick={() => setIsCreating(true)}>Create Your First Add-On</Button>
                )}
              </div>
            </Card>
          ) : (
            addons.map((addon) => (
              <Card key={addon.id} withRail>
                {editingId === addon.id ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-text">Edit Add-On</h3>
                    <Input
                      label="Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Input
                      label="Price ($)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.priceDollars}
                      onChange={(e) => setFormData({ ...formData, priceDollars: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`active-${addon.id}`}
                        checked={addon.isActive}
                        onChange={(e) => {
                          const newActive = e.target.checked;
                          if (newActive && maxActiveReached && !addon.isActive) {
                            setError('Maximum 4 active add-ons allowed per category.');
                            return;
                          }
                          handleUpdate(addon.id, { isActive: newActive });
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`active-${addon.id}`} className="text-sm text-text">
                        Active
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          const price = parseFloat(formData.priceDollars);
                          if (Number.isNaN(price) || price < 0) {
                            setError('Price must be a valid number.');
                            return;
                          }
                          handleUpdate(addon.id, {
                            title: formData.title.trim(),
                            priceDollars: price,
                          });
                        }}
                      >
                        Save
                      </Button>
                      <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-text">{addon.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          addon.isActive
                            ? 'bg-success/15 text-text'
                            : 'bg-surface2 text-muted'
                        }`}>
                          {addon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-text">
                        {formatMoney(addon.priceCents)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => startEdit(addon)}
                        className="text-sm"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(addon.id)}
                        className="text-sm text-red-600 hover:text-text"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Create Button */}
        {!isCreating && addons.length > 0 && (
          <div className="mt-6">
            <Button
              onClick={() => setIsCreating(true)}
              disabled={maxActiveReached}
            >
              {maxActiveReached
                ? 'Maximum 4 Active Add-Ons Reached'
                : 'Create New Add-On'}
            </Button>
            {maxActiveReached && (
              <p className="text-sm text-muted mt-2">
                Deactivate an existing add-on to create a new one.
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}




