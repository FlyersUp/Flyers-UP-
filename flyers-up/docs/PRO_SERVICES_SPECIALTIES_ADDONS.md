# Standard Services + Specialties + Add-ons System

## A. Summary of Changes

This implementation introduces a clear separation between **Occupation**, **Service Types**, **Specialties**, and **Add-ons** for the Flyers Up marketplace.

### 1. Four Distinct Layers

| Layer | Description | Source | Used For |
|-------|-------------|--------|----------|
| **Occupation** | Pro's top-level trade (e.g., Cleaner, Handyman) | Platform | Browse, taxonomy |
| **Service Types** | Official platform-defined services (e.g., Standard Cleaning, Deep Cleaning) | Platform | Search, filtering, matching, analytics |
| **Specialties** | Optional Pro-defined identity tags | Pro | Profile display, future soft signals |
| **Add-ons** | Optional service extras with price | Pro | Checkout upsells |

### 2. What Was Implemented

- **pro_specialties** table: Pro-defined specialties (max 8, label max 40 chars, case-insensitive dedupe)
- **service_addons** enhancements: `description` (nullable), `occupation_id`, `service_type_id` (nullable)
- **Specialty presets** by occupation for quick selection
- **Onboarding flow**: Occupation → Service Types → Specialties → Add-ons → Setup
- **Pro profile**: Separate sections for Service Types, Specialties, Add-ons
- **Pro specialties page** (`/pro/specialties`): Manage specialties
- **Add-on description** support in create/edit

---

## B. Schema / Migration Changes

### Migration: `075_pro_specialties_and_addon_enhancements.sql`

**New table: `pro_specialties`**
- `id` uuid PK
- `pro_id` uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
- `label` text NOT NULL
- `normalized_label` text NOT NULL
- `active` boolean NOT NULL DEFAULT true
- `created_at` timestamptz NOT NULL
- UNIQUE(pro_id, normalized_label)

**Triggers:**
- `enforce_pro_specialties_limits`: max 8 per pro, label max 40 chars, trim/normalize

**service_addons changes:**
- `description` text (nullable)
- `occupation_id` uuid REFERENCES occupations(id) (nullable)
- `service_type_id` uuid REFERENCES occupation_services(id) (nullable)

**Triggers:**
- `enforce_addon_title_unique_per_pro`: no duplicate add-on names per pro (case-insensitive)

---

## C. Deprecated Fields / Tables Left in Place

- **service_addons.service_category** – Kept for backward compatibility. New addons still populate it via occupation → category mapping.
- **service_pros.category_id** – Legacy; still used for display and addon resolution.
- **pro_service_subcategories** – Existing table; not modified. Search continues to use occupation_services (pro_services) only.

---

## D. Assumptions

1. **pro_id in pro_specialties** = user id (profiles.id = auth.users.id). Same convention as service_addons.
2. **Specialties are display-only** for search/filter today; they may be used as soft signals later.
3. **Add-ons** remain scoped by service_category (resolved from occupation slug via OCCUPATION_TO_SERVICE_SLUG).
4. **Max 4 active add-ons per category** (existing trigger) unchanged.
5. **Role selection** (step 1) happens on a separate page; onboarding progress starts at step 2 (Occupation).

---

## E. Manual QA Checklist

### Occupation & Service Types
- [ ] Pro can select an occupation
- [ ] Pro can select 1+ official service types
- [ ] At least one service type is required to proceed
- [ ] Helper text: "These determine how customers find you"

### Specialties
- [ ] Pro can add specialties (optional)
- [ ] Duplicate specialties are blocked (case-insensitive)
- [ ] Max 8 specialties enforced
- [ ] Label max 40 characters enforced
- [ ] Specialty presets appear based on occupation
- [ ] Specialties do NOT appear as official search/filter options

### Add-ons
- [ ] Pro can create add-ons with name, price
- [ ] Optional description field works
- [ ] Active/inactive toggle works
- [ ] Duplicate add-on names blocked per pro
- [ ] Add-ons show separately from specialties on profile

### Profile & Navigation
- [ ] Occupation, Service Types, Specialties, Add-ons appear in separate sections on profile
- [ ] Specialties and Add-ons sections always visible (even when empty) with Manage links
- [ ] Links to Manage Specialties and Manage Add-ons work
- [ ] Existing profiles still load correctly

### Search & Filter
- [ ] Search/filter uses only official service types (occupation_services via pro_services)
- [ ] Specialties are not used for search filters

### Backward Compatibility
- [ ] Pros without occupation_id still work (category-based addons)
- [ ] Existing addons without description display correctly
