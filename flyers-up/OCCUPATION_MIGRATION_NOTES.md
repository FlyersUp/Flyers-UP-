# Occupation Migration Notes

Migration from "Choose a category" to "Choose an occupation" (Occupation → Services structure).

## Files Updated

### Main "Choose" Page
- **`app/(app)/customer/categories/page.tsx`** — Replaced category grid with occupation grid. Now shows featured occupations from DB, search bar, "More occupations" button. Routes to `/occupations/[slug]`.

### Occupations Routes (existing)
- **`app/(app)/occupations/page.tsx`** — More Occupations page: all occupations, search, grid.
- **`app/(app)/occupations/[slug]/page.tsx`** — Occupation detail: header, service chips, Flyer Wall, empty state.

### Components
- **`components/occupations/OccupationCard.tsx`** — Bulletin-style card with Lucide icon.
- **`components/occupations/OccupationGrid.tsx`** — Responsive grid (featured / all variants).
- **`components/occupations/ServiceChips.tsx`** — Horizontally scrollable service chips.
- **`components/occupations/OccupationSearchBar.tsx`** — Search input with icon.
- **`lib/occupationIcons.ts`** — Lucide icon mapping by slug.
- **`lib/occupationData.ts`** — Server-side data helpers (getFeaturedOccupations, etc.).

### Sidebar & Dashboard
- **`components/ui/SideMenu.tsx`** — "Browse Services" → "Browse Occupations", href `/occupations`.
- **`components/dashboard/CustomerDashboard.tsx`** — "Browse services" → "Browse occupations", href `/occupations`.
- **`components/profile/CustomerAccountView.tsx`** — "Browse services" → "Browse occupations", href `/occupations`.

### Links Updated (category → occupation)
- **`app/(app)/customer/bookings/page.tsx`** — Browse link.
- **`app/(app)/customer/bookings/history/page.tsx`** — Browse link.
- **`app/(app)/customer/favorites/page.tsx`** — Browse link.
- **`app/(app)/customer/categories/[id]/page.tsx`** — Back link, Browse link (legacy category detail).
- **`app/(app)/customer/booking/service/page.tsx`** — Browse button.
- **`app/(app)/customer/notifications/page.tsx`** — Browse link.
- **`app/(app)/customer/services/page.tsx`** — Browse by occupation link.
- **`app/(app)/customer/services/[slug]/page.tsx`** — Browse link.
- **`app/(app)/browse/page.tsx`** — Comment updated.

### Services Page
- **`app/(app)/services/page.tsx`** — Now redirects to `/occupations` (canonical browse). `/services/[category]` retained for backward compatibility.

### Request Flow & Onboarding
- **`app/(app)/customer/request/start/page.tsx`** — "Service" → "Occupation" labels.
- **`app/(app)/customer/requests/new/page.tsx`** — "Service category" → "Occupation".
- **`app/(app)/onboarding/pro/page.tsx`** — "Primary category" → "Choose your occupation", "Subcategories" → "Select the services you offer".
- **`app/(app)/settings/business/page.tsx`** — "Primary service category" → "Primary occupation".
- **`app/(app)/pro/profile/page.tsx`** — "Select a category" → "Select your occupation".

## Backward Compatibility

- **`/customer/categories/[id]`** — Legacy category-by-UUID page retained for old links. Uses `service_categories` and `getProsByCategory`. Links updated to "Browse occupations" → `/occupations`.
- **Booking logic** — Unchanged. Uses `service_category`, `category_id` internally.
- **Data model** — `service_categories`, `service_pros` unchanged. `occupations` and `occupation_services` are additive. `OCCUPATION_TO_SERVICE_SLUG` maps occupation slugs to legacy category slugs for pro lookup.

## Design Tokens

- Background: `#F5F5F5`
- Cards: white, `border-black/5`, `shadow-[0_10px_25px_rgba(0,0,0,0.06)]`
- Radius: `rounded-2xl`
- Text: `text-zinc-900`, `text-zinc-700`, `text-zinc-500`
