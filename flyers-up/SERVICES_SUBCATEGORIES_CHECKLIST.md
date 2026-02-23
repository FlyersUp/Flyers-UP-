# Services + Subcategories Production Verification Checklist

After running migrations `020_services_and_subcategories.sql` and `021_photography_and_pet_care_services.sql`:

## 1. Database

- [ ] Migration runs without errors
- [ ] Tables exist: `services`, `service_subcategories`, `pro_service_subcategories`
- [ ] `service_pros` has `primary_service_id` column
- [ ] RLS policies: anon/auth can read active services and subcategories; pros can insert/delete only their own `pro_service_subcategories`

## 2. Public Access (no auth)

- [ ] `GET /api/marketplace/services` returns active services
- [ ] `GET /api/marketplace/subcategories?serviceSlug=handyman` returns subcategories
- [ ] Inactive services/subcategories never appear in responses

## 3. Pro Onboarding

- [ ] `/onboarding/pro` loads active services (radio list)
- [ ] Selecting a service loads its subcategories (multi-select checkboxes)
- [ ] Must select at least one subcategory to proceed
- [ ] Submitting saves `pro_service_subcategories` and updates `service_pros.primary_service_id` + `category_id`

## 4. Pro Security

- [ ] Pro A cannot insert/delete Pro B’s subcategory selections
- [ ] Selecting subcategory IDs not under the chosen service is rejected

## 5. Customer Browse

- [ ] `/customer/services` lists active services
- [ ] `/customer/services/handyman` lists pros (by `primary_service_id` or legacy `category_id`)
- [ ] Subcategory pills filter pros who offer that subcategory
- [ ] Old pros (category_id only, no `pro_service_subcategories`) still show when filtering by main service only

## 6. Backward Compatibility

- [ ] Existing pros with `category_id` only still appear in browse when filtering by main service
- [ ] `/customer/categories` (legacy) still works
- [ ] No hard deletes; deprecated categories use `is_active=false`

## Onboarding Snippet (already implemented)

When a pro selects `photography` or `pet-care`:

```tsx
// primaryServiceSlug changes → useEffect loads subcategories
useEffect(() => {
  if (!primaryServiceSlug) return;
  getActiveSubcategoriesByServiceSlugAction(primaryServiceSlug).then(setSubcategories);
}, [primaryServiceSlug]);

// Submit: validate ≥1 subcategory, then save
setMyProSubcategorySelectionsAction(primaryServiceSlug, selectedSubcategoryIds);
```

## Marketplace Query Example

```ts
// Filter pros by service only
getMarketplacePros(supabase, { serviceSlug: 'photography' });

// Filter pros by service + subcategory
getMarketplacePros(supabase, { serviceSlug: 'pet-care', subcategorySlug: '30-min-walk' });
```

## 7. Photography + Pet Care (Migration 021)

- [ ] `photography` service has sort_order 40 and 8 subcategories
- [ ] `pet-care` service has sort_order 20 and 8 subcategories
- [ ] Pro onboarding: selecting Photography loads only photography subcategories (event-photography, portrait-photography, etc.)
- [ ] Pro onboarding: selecting Pet Care loads only pet-care subcategories (30-min-walk, 60-min-walk, etc.)
- [ ] `/customer/services/photography` and `/customer/services/pet-care` list pros
- [ ] Subcategory filter (e.g. wedding-photography, 30-min-walk) filters pros correctly
- [ ] Reject subcategory IDs not belonging to selected service
