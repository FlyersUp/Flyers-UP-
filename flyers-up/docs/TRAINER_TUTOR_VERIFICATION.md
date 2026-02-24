# Trainer / Tutor Feature – Verification Checklist

Replace Photography with Trainer/Tutor (Education + Coaching). Photography is deactivated, not deleted.

---

## 1. SQL Migration (`027_trainer_tutor_replace_photography.sql`)

- [ ] **Photography deactivation**
  - `services`: `slug = 'photography'` → `is_active = false`
  - `service_categories`: `slug = 'photography'` → `is_active_phase1 = false`
  - No rows deleted; photography subcategories remain for future reactivation

- [ ] **Trainer/Tutor main service**
  - `services`: upsert `slug = 'trainer-tutor'`, name, description, `sort_order = 40`, `is_active = true`
  - `service_categories`: upsert same for legacy `category_id` mapping, `is_active_phase1 = true`

- [ ] **Trainer/Tutor subcategories (17)**
  - All upserted with `service_id` from `services.slug = 'trainer-tutor'`
  - `requires_license = false`, `is_active = true`, sequential `sort_order`
  - UNIQUE(service_id, slug) respected via ON CONFLICT (service_id, slug) DO UPDATE

- [ ] **RLS**
  - No policy changes; existing policies use `is_active` and continue to apply

---

## 2. Pro Onboarding

- [ ] **Active services list**
  - `getActiveServicesAction()` returns only `is_active = true` → Photography excluded, Trainer/Tutor included

- [ ] **Subcategories by service**
  - Pro selects "Trainer / Tutor" → `getActiveSubcategoriesByServiceSlugAction('trainer-tutor')` returns 17 subcategories only (no photography)

- [ ] **Validation**
  - At least one subcategory required; multi-select allowed
  - `setMyProSubcategorySelectionsAction` rejects subcategory IDs not belonging to selected service and rejects inactive services/subcategories

- [ ] **Photography pros**
  - Business settings: load categories with `includeHidden: true`
  - If primary category has `is_active_phase1 === false`, show banner and enable dropdown so they can select a new service (e.g. Trainer/Tutor)
  - Dropdown options show only active categories

---

## 3. Marketplace (Customer Browse)

- [ ] **Services list**
  - `GET /api/marketplace/services` → `getActiveServices()` → only active services (Trainer/Tutor yes, Photography no)

- [ ] **Pros by service**
  - `GET /api/marketplace/pros?serviceSlug=trainer-tutor` → pros with `primary_service_id` or `category_id` for trainer-tutor; only active service/subcategories in join

- [ ] **Pros by subcategory**
  - `GET /api/marketplace/pros?serviceSlug=trainer-tutor&subcategorySlug=sat-act-prep` → only pros who have that subcategory in `pro_service_subcategories`, with active service and subcategory

- [ ] **Filtering**
  - Joins: services → service_subcategories → pro_service_subcategories → service_pros
  - All filters use `is_active = true` for services and subcategories

---

## 4. DB Helpers (`lib/db/services.ts`)

- [ ] `getActiveServices()` – `.eq('is_active', true)` (no change)
- [ ] `getActiveSubcategoriesByServiceSlug()` – service must be active, subcategories `.eq('is_active', true)` (no change)
- [ ] `getMarketplacePros()` – service and optional subcategory must be active (no change)

---

## 5. Future-Ready

- [ ] No subscriptions implemented; schema remains compatible for recurring sessions and package pricing
- [ ] Optional future: background verification flag, hourly rate ranges per subcategory

---

## 6. Run Migration

```bash
supabase db push
# or
psql -f supabase/migrations/027_trainer_tutor_replace_photography.sql
```

Then verify:

- `SELECT slug, is_active FROM services WHERE slug IN ('photography','trainer-tutor');`
- `SELECT slug, name, sort_order FROM service_subcategories WHERE service_id = (SELECT id FROM services WHERE slug = 'trainer-tutor') ORDER BY sort_order;`
