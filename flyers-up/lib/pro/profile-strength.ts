import { parseBusinessHoursModel } from '@/lib/utils/businessHours';
import type { ProfileStrengthBreakdownItem, ProfileStrengthDto } from '@/lib/pro/growth-menu-types';

export type ProfileStrengthInputs = {
  avatarUrl: string | null | undefined;
  profilePhotoPath: string | null | undefined;
  bio: string | null | undefined;
  categoryId: string | null | undefined;
  occupationId: string | null | undefined;
  subcategoryLinkCount: number;
  servicesOfferedCount: number;
  serviceRadius: number | null | undefined;
  serviceAreaZip: string | null | undefined;
  location: string | null | undefined;
  serviceAreaMode: string | null | undefined;
  serviceAreaValues: string[] | null | undefined;
  businessHoursJson: string | null | undefined;
  availabilityRuleCount: number;
  legacyAvailabilityRowCount: number;
  stripeAccountId: string | null | undefined;
  stripeChargesEnabled: boolean | null | undefined;
  hasCompletedPaidJob: boolean;
};

const MIN_BIO_LEN = 24;

/**
 * v1 profile strength / 100 — discrete checklist items (sum of earned points).
 */
export function computeProfileStrengthV1(input: ProfileStrengthInputs): ProfileStrengthDto {
  const hasPhoto = Boolean(
    (input.avatarUrl && input.avatarUrl.trim()) || (input.profilePhotoPath && input.profilePhotoPath.trim())
  );
  const bio = (input.bio ?? '').trim();
  const hasBio = bio.length >= MIN_BIO_LEN;
  const hasCategory = Boolean(input.categoryId?.trim()) || Boolean(input.occupationId?.trim());
  const hasSpecialties =
    (input.subcategoryLinkCount ?? 0) > 0 || (input.servicesOfferedCount ?? 0) > 0;
  const hasServiceArea =
    (input.serviceRadius != null && Number(input.serviceRadius) > 0) ||
    Boolean((input.serviceAreaZip ?? '').trim()) ||
    Boolean((input.location ?? '').trim()) ||
    (Array.isArray(input.serviceAreaValues) && input.serviceAreaValues.length > 0) ||
    Boolean((input.serviceAreaMode ?? '').trim());
  const bh = parseBusinessHoursModel(input.businessHoursJson ?? null);
  const weeklyAny = Object.values(bh.weekly).some((d) => d?.enabled);
  const hasAvailability =
    (input.availabilityRuleCount ?? 0) > 0 ||
    (input.legacyAvailabilityRowCount ?? 0) > 0 ||
    weeklyAny;
  const payoutOk =
    Boolean((input.stripeAccountId ?? '').trim()) && input.stripeChargesEnabled === true;
  const firstJob = input.hasCompletedPaidJob;

  const defs: Array<{
    id: string;
    label: string;
    max: number;
    done: boolean;
  }> = [
    { id: 'photo', label: 'Profile photo', max: 13, done: hasPhoto },
    { id: 'bio', label: 'Intro / bio', max: 13, done: hasBio },
    { id: 'category', label: 'Occupation & category', max: 12, done: hasCategory },
    { id: 'specialties', label: 'Specialties / services', max: 12, done: hasSpecialties },
    { id: 'service_area', label: 'Service area', max: 12, done: hasServiceArea },
    { id: 'availability', label: 'Availability', max: 12, done: hasAvailability },
    { id: 'payout', label: 'Payout setup (Stripe)', max: 13, done: payoutOk },
    { id: 'first_job', label: 'First completed job', max: 13, done: firstJob },
  ];

  const items: ProfileStrengthBreakdownItem[] = defs.map((d) => {
    const earned = d.done ? d.max : 0;
    return {
      id: d.id,
      label: d.label,
      pointsEarned: earned,
      pointsMax: d.max,
      done: d.done,
    };
  });

  const score = Math.min(100, items.reduce((s, i) => s + i.pointsEarned, 0));

  return { score, maxScore: 100, items };
}
