import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveActiveThisWeek,
  isProMatchableForOccupationBorough,
  proServesBoroughForGate,
} from '@/lib/marketplace/proMatchable';
import type { SupplyTrustContext } from '@/lib/marketplace/supplyTrustContext';

test('proServesBoroughForGate: boroughs list only', () => {
  assert.equal(proServesBoroughForGate('boroughs', ['Brooklyn'], 'brooklyn'), true);
  assert.equal(proServesBoroughForGate('radius', [], 'brooklyn'), false);
  assert.equal(proServesBoroughForGate('boroughs', [], 'brooklyn'), false);
});

test('computeEffectiveActiveThisWeek: manual flag', () => {
  assert.equal(
    computeEffectiveActiveThisWeek({
      is_verified: true,
      is_paused: false,
      is_active_this_week: true,
      available: true,
      closed_at: null,
      last_confirmed_available_at: null,
      last_matched_at: null,
      recent_response_score: null,
    }),
    true
  );
});

test('isProMatchableForOccupationBorough: requires core + borough', () => {
  const base = {
    is_verified: true,
    is_paused: false,
    is_active_this_week: true,
    available: true,
    closed_at: null,
    last_confirmed_available_at: null,
    last_matched_at: null,
    recent_response_score: null,
    service_area_mode: 'boroughs' as const,
    service_area_values: ['manhattan'] as string[],
  };
  assert.equal(isProMatchableForOccupationBorough(base, 'manhattan'), true);
  assert.equal(isProMatchableForOccupationBorough(base, 'brooklyn'), false);
});

test('isProMatchableForOccupationBorough: trust excludes chronic no_response', () => {
  const base = {
    is_verified: true,
    is_paused: false,
    is_active_this_week: true,
    available: true,
    closed_at: null,
    last_confirmed_available_at: null,
    last_matched_at: null,
    recent_response_score: null,
    service_area_mode: 'boroughs' as const,
    service_area_values: ['manhattan'] as string[],
  };
  const trust: SupplyTrustContext = {
    profile_updated_at: new Date().toISOString(),
    no_response_count_30d: 2,
    had_booking_60d: false,
    had_outreach_response_60d: false,
  };
  assert.equal(isProMatchableForOccupationBorough(base, 'manhattan', trust), false);
});
