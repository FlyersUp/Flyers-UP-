# Service Categories Setup - Complete Guide

## ✅ What's Already Configured

The app is **fully set up** to support all 10 service categories. Here's what's ready:

### 1. **Database Schema** (`supabase/schema.sql`)
All 10 categories are defined in the schema:
- ✅ Cleaning (🧹)
- ✅ Plumbing (🔧)
- ✅ Lawn Care (🌿)
- ✅ Handyman (🔨)
- ✅ Photographer (📸) - NEW
- ✅ HVAC (❄️) - NEW
- ✅ Roofing (🏠) - NEW
- ✅ Pest Control (🐛) - NEW
- ✅ Carpet Cleaning (🧽) - NEW
- ✅ Landscaping (🌳) - NEW

### 2. **Pro Business Profile** (`/app/settings/business/page.tsx`)
- Pros can select any of the 10 categories when creating/updating their business
- Dropdown automatically loads all categories from the database
- Category selection is required when creating a pro profile

### 3. **Customer Browsing** (`/app/services/page.tsx`)
- Customers can browse all service categories
- Each category shows icon, name, and description
- Clicking a category shows all pros in that category

### 4. **Category-Specific Pro Lists** (`/app/services/[category]/page.tsx`)
- Customers can view all pros for a specific category
- Shows pros filtered by category slug
- Displays pro cards with ratings, prices, and availability

### 5. **API Functions** (`lib/api.ts`)
- `getServiceCategories()` - Fetches all categories from database
- `getProsByCategory(categorySlug)` - Gets pros for a specific category
- `getProByUserId()` - Gets pro's category for business settings

## 🚀 How to Add Categories to Your Database

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run the Migration SQL

Copy and paste this SQL:

```sql
-- Insert new service categories
INSERT INTO public.service_categories (slug, name, description, icon) VALUES
  ('photographer', 'Photographer', 'Professional photography services for events, portraits, and commercial', '📸'),
  ('hvac', 'HVAC', 'Heating, ventilation, and air conditioning installation and repair', '❄️'),
  ('roofing', 'Roofing', 'Roof installation, repair, and maintenance services', '🏠'),
  ('pest-control', 'Pest Control', 'Extermination and prevention of pests and insects', '🐛'),
  ('carpet-cleaning', 'Carpet Cleaning', 'Professional carpet and upholstery cleaning services', '🧽'),
  ('landscaping', 'Landscaping', 'Landscape design, installation, and maintenance', '🌳')
ON CONFLICT (slug) DO NOTHING;
```

### Step 3: Click "Run" (or press Ctrl+Enter)

### Step 4: Verify Categories Were Added

Run this query to see all categories:

```sql
SELECT slug, name, icon, description 
FROM public.service_categories 
ORDER BY name;
```

You should see all 10 categories listed.

## 📋 How It Works

### For Pros:
1. **Sign up as a Pro** → Create account with role='pro'
2. **Go to Settings → My Business** (`/settings/business`)
3. **Select Service Category** → Choose from dropdown (all 10 categories available)
4. **Fill in business details** → Name, bio, price, etc.
5. **Save** → Profile is created with selected category

### For Customers:
1. **Browse Categories** → Go to `/services` to see all 10 categories
2. **Select Category** → Click on any category card
3. **View Pros** → See all pros offering that service
4. **Book Service** → Click on pro to book

### Category Slugs:
- `cleaning`
- `plumbing`
- `lawn-care`
- `handyman`
- `photographer`
- `hvac`
- `roofing`
- `pest-control`
- `carpet-cleaning`
- `landscaping`

## 🔗 Related Files

- **Database Schema**: `supabase/schema.sql` (lines 343-353)
- **Migration File**: `supabase/migrations/005_add_new_service_categories.sql`
- **Business Settings**: `app/settings/business/page.tsx`
- **Category Browse**: `app/services/page.tsx`
- **Category Pros List**: `app/services/[category]/page.tsx`
- **API Functions**: `lib/api.ts` (getServiceCategories, getProsByCategory)

## ✅ After Running Migration

Once you run the SQL migration:
- ✅ All 10 categories will be in your database
- ✅ Pros can select any category when creating their business
- ✅ Customers can browse and filter by all 10 categories
- ✅ Bookings will be associated with the correct category
- ✅ Add-ons feature will work with all categories (pros can create add-ons per category)

Everything is ready to go! 🎉









