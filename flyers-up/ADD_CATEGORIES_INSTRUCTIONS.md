# How to Add New Service Categories to Database

## Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the SQL**
   - Open the file: `supabase/migrations/005_add_new_service_categories.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Query**
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - You should see "Success. No rows returned" or a confirmation message

5. **Verify**
   - Run this query to see all categories:
   ```sql
   SELECT * FROM public.service_categories ORDER BY name;
   ```
   - You should see all 10 categories including the 6 new ones

## Option 2: Using Supabase CLI (If Installed)

If you have Supabase CLI installed and linked:

```bash
cd flyers-up
supabase db push
```

## SQL to Run:

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

## Categories Being Added:

1. **photographer** (📸) - Professional photography services
2. **hvac** (❄️) - Heating, ventilation, and air conditioning
3. **roofing** (🏠) - Roof installation and repair
4. **pest-control** (🐛) - Pest extermination and prevention
5. **carpet-cleaning** (🧽) - Carpet and upholstery cleaning
6. **landscaping** (🌳) - Landscape design and maintenance









