/**
 * Fetch and update user guidance preferences (onboarding + hints).
 */

import { supabase } from '@/lib/supabaseClient';
import type { UserGuidancePreferences } from './types';
import { CURRENT_ONBOARDING_VERSION } from './types';

const DEFAULT: UserGuidancePreferences = {
  onboardingCompletedAt: null,
  onboardingSkippedAt: null,
  onboardingVersion: CURRENT_ONBOARDING_VERSION,
  dismissedHintKeys: [],
};

export async function getUserGuidancePreferences(
  userId: string
): Promise<UserGuidancePreferences> {
  const { data, error } = await supabase
    .from('user_app_preferences')
    .select('onboarding_completed_at, onboarding_skipped_at, onboarding_version, dismissed_hint_keys')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT };

  return {
    onboardingCompletedAt: data.onboarding_completed_at ?? null,
    onboardingSkippedAt: data.onboarding_skipped_at ?? null,
    onboardingVersion: data.onboarding_version ?? CURRENT_ONBOARDING_VERSION,
    dismissedHintKeys: Array.isArray(data.dismissed_hint_keys)
      ? (data.dismissed_hint_keys as string[])
      : [],
  };
}

export async function markOnboardingCompleted(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_app_preferences').upsert(
      {
        user_id: userId,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_version: CURRENT_ONBOARDING_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('markOnboardingCompleted:', err);
    return { success: false, error: 'Failed to save' };
  }
}

export async function markOnboardingSkipped(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_app_preferences').upsert(
      {
        user_id: userId,
        onboarding_skipped_at: new Date().toISOString(),
        onboarding_version: CURRENT_ONBOARDING_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('markOnboardingSkipped:', err);
    return { success: false, error: 'Failed to save' };
  }
}

export async function dismissHint(
  userId: string,
  hintKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const prefs = await getUserGuidancePreferences(userId);
    const keys = new Set(prefs.dismissedHintKeys);
    if (keys.has(hintKey)) return { success: true };

    keys.add(hintKey);
    const { error } = await supabase.from('user_app_preferences').upsert(
      {
        user_id: userId,
        dismissed_hint_keys: Array.from(keys),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('dismissHint:', err);
    return { success: false, error: 'Failed to save' };
  }
}

export async function resetDismissedHints(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_app_preferences').upsert(
      {
        user_id: userId,
        dismissed_hint_keys: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('resetDismissedHints:', err);
    return { success: false, error: 'Failed to save' };
  }
}
