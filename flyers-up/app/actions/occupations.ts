'use server';

import { getAllOccupations } from '@/lib/occupationData';
import type { OccupationRow } from '@/lib/occupationData';

/** Public: get all occupations for pro onboarding and browse */
export async function getOccupationsAction(): Promise<OccupationRow[]> {
  return getAllOccupations();
}
