-- ============================================
-- Expand occupation_services to 5 subcategories per occupation
-- (Snow removal already has 5; synced to service_subcategories for booking.)
-- ============================================

-- 1) occupation_services (unique per occupation_id + slug)
INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'shelf-rail-installation', 'Shelf & rail installation', 'Shelves, closet rods, towel bars, and hanging hardware', 'fixed', 50, true FROM public.occupations WHERE slug = 'handyman'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'act-prep-tutoring', 'ACT prep', 'ACT strategy, practice tests, and section coaching', 'fixed', 50, true FROM public.occupations WHERE slug = 'tutor'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'real-estate-listing-photography', 'Real estate listing photos', 'MLS-ready interiors, exteriors, and amenities', 'fixed', 40, true FROM public.occupations WHERE slug = 'photographer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'ecommerce-product-photography', 'E-commerce product shots', 'Catalog, lifestyle, and flat-lay product imagery', 'fixed', 50, true FROM public.occupations WHERE slug = 'photographer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'wedding-highlight-film', 'Wedding highlight film', 'Short cinematic recap of the day', 'fixed', 40, true FROM public.occupations WHERE slug = 'videographer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'customer-testimonial-video', 'Customer testimonial video', 'Interview-style credibility clips for brands', 'fixed', 50, true FROM public.occupations WHERE slug = 'videographer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'short-term-rental-turnover-cleaning', 'Short-term rental turnover', 'Quick turnover cleans between guest stays', 'fixed', 40, true FROM public.occupations WHERE slug = 'cleaner'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'post-renovation-dust-cleaning', 'Post-renovation dust clean', 'Fine dust and debris cleanup after projects', 'fixed', 50, true FROM public.occupations WHERE slug = 'cleaner'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'brisk-exercise-dog-walks', 'Brisk exercise walks', 'Higher-energy walks for active dogs', 'fixed', 30, true FROM public.occupations WHERE slug = 'dog-walker'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'puppy-potty-training-visits', 'Puppy potty training visits', 'Frequent outings and routine reinforcement', 'fixed', 40, true FROM public.occupations WHERE slug = 'dog-walker'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'pet-feeding-medication-rounds', 'Feeding & medication visits', 'Scheduled meals and vet-directed medications', 'fixed', 50, true FROM public.occupations WHERE slug = 'dog-walker'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'birthday-milestone-party-planning', 'Birthday & milestone parties', 'Theming, vendors, and day-of coordination', 'fixed', 30, true FROM public.occupations WHERE slug = 'event-planner'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'baby-shower-planning', 'Baby shower planning', 'Venues, decor timelines, and guest flow', 'fixed', 40, true FROM public.occupations WHERE slug = 'event-planner'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'nonprofit-fundraising-gala', 'Nonprofit fundraising gala', 'Program flow, sponsorships, and volunteer roles', 'fixed', 50, true FROM public.occupations WHERE slug = 'event-planner'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'full-residence-packing-service', 'Full packing service', 'Room-by-room packing and labeling', 'fixed', 30, true FROM public.occupations WHERE slug = 'mover'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'furniture-disassembly-assembly', 'Furniture disassembly & assembly', 'Beds, tables, and modular pieces for safe transport', 'fixed', 40, true FROM public.occupations WHERE slug = 'mover'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'donation-and-drop-off-hauling', 'Donation & drop-off hauling', 'Runs to donation centers or disposal with sorting', 'fixed', 50, true FROM public.occupations WHERE slug = 'mover'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'hiit-conditioning-sessions', 'HIIT conditioning', 'High-intensity intervals and metabolic conditioning', 'fixed', 20, true FROM public.occupations WHERE slug = 'personal-trainer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'marathon-running-coaching', 'Distance running coaching', 'Plan building, pacing, and injury-aware mileage', 'fixed', 30, true FROM public.occupations WHERE slug = 'personal-trainer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'nutrition-habit-coaching', 'Nutrition habit coaching', 'Meal structure, macros awareness, and consistency', 'fixed', 40, true FROM public.occupations WHERE slug = 'personal-trainer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'mobility-recovery-sessions', 'Mobility & recovery', 'Foam rolling, stretching flows, and joint prep', 'fixed', 50, true FROM public.occupations WHERE slug = 'personal-trainer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'private-party-dj', 'Private party DJ', 'House parties, birthdays, and backyard events', 'fixed', 20, true FROM public.occupations WHERE slug = 'dj'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'corporate-gala-dj', 'Corporate gala DJ', 'Awards nights, galas, and brand-friendly sets', 'fixed', 30, true FROM public.occupations WHERE slug = 'dj'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'karaoke-dj-host', 'Karaoke DJ host', 'Song rotation, mic hosting, and audience management', 'fixed', 40, true FROM public.occupations WHERE slug = 'dj'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'silent-disco-headset-rental-dj', 'Silent disco headset DJ', 'Multi-channel silent disco programming and logistics', 'fixed', 50, true FROM public.occupations WHERE slug = 'dj'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'weekly-meal-prep-chef', 'Weekly meal prep chef', 'Batch cooking and labeled fridge/freezer packs', 'fixed', 20, true FROM public.occupations WHERE slug = 'chef'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'small-dinner-party-chef', 'Small dinner party chef', 'Multi-course dinners for intimate groups', 'fixed', 30, true FROM public.occupations WHERE slug = 'chef'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'in-home-cooking-class-chef', 'In-home cooking class', 'Hands-on lessons with customized menus', 'fixed', 40, true FROM public.occupations WHERE slug = 'chef'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'allergy-aware-menu-chef', 'Allergy-aware menu design', 'Menus aligned to dietary restrictions', 'fixed', 50, true FROM public.occupations WHERE slug = 'chef'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'natural-everyday-glam', 'Natural everyday glam', 'Polished, natural everyday makeup', 'fixed', 20, true FROM public.occupations WHERE slug = 'makeup-artist'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'photoshoot-makeup-session', 'Photoshoot makeup', 'Camera-ready finish with touch-up kit', 'fixed', 30, true FROM public.occupations WHERE slug = 'makeup-artist'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'theatrical-character-makeup', 'Theatrical character makeup', 'Stage, cosplay, or character-driven looks', 'fixed', 40, true FROM public.occupations WHERE slug = 'makeup-artist'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'private-makeup-lesson', 'Private makeup lesson', 'One-on-one techniques tailored to your routine', 'fixed', 50, true FROM public.occupations WHERE slug = 'makeup-artist'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'beard-shaping-lineup', 'Beard shaping & lineup', 'Sculpting, taper, and sharp edge work', 'fixed', 20, true FROM public.occupations WHERE slug = 'barber'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'textured-crop-fade', 'Textured crop & fade', 'Modern fades with texture and styling coaching', 'fixed', 30, true FROM public.occupations WHERE slug = 'barber'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'senior-gentlemen-haircut', 'Senior gentlemen''s haircut', 'Comfortable pacing and classic finishes', 'fixed', 40, true FROM public.occupations WHERE slug = 'barber'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'kids-barbershop-haircut', 'Kids barbershop haircut', 'Patient first-time and school-year cuts', 'fixed', 50, true FROM public.occupations WHERE slug = 'barber'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'brake-pad-rotor-service', 'Brake pad & rotor service', 'Inspection, replacement, and bedding guidance', 'fixed', 20, true FROM public.occupations WHERE slug = 'mechanic'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'battery-starter-charging-test', 'Battery & charging system test', 'Load tests, alternator checks, and replacement', 'fixed', 30, true FROM public.occupations WHERE slug = 'mechanic'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'tire-mount-balance-rotation', 'Mount, balance & rotation', 'Seasonal swaps and even wear rotation', 'fixed', 40, true FROM public.occupations WHERE slug = 'mechanic'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'pre-purchase-vehicle-inspection', 'Pre-purchase inspection', 'Buyer-focused checklist before you commit', 'fixed', 50, true FROM public.occupations WHERE slug = 'mechanic'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'wifi-coverage-mesh-upgrade', 'Wi-Fi coverage & mesh upgrade', 'Dead-zone fixes and access point placement', 'fixed', 20, true FROM public.occupations WHERE slug = 'it-technician'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'printer-scanner-setup-it', 'Printer & scanner setup', 'Drivers, wireless queues, and scan-to-folder', 'fixed', 30, true FROM public.occupations WHERE slug = 'it-technician'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'os-reinstall-data-migration-it', 'OS reinstall & data migration', 'Clean installs with profile and file moves', 'fixed', 40, true FROM public.occupations WHERE slug = 'it-technician'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'streaming-device-smart-tv-setup', 'Streaming & smart TV setup', 'Apps, accounts, and HDMI/source configuration', 'fixed', 50, true FROM public.occupations WHERE slug = 'it-technician'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'mulch-bed-edging-refresh', 'Mulch & bed edging refresh', 'Beds redefined, mulch top-off, and crisp edges', 'fixed', 20, true FROM public.occupations WHERE slug = 'landscaper'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'seasonal-leaf-cleanup', 'Seasonal leaf cleanup', 'Bagging, curbside piles, and turf rescue', 'fixed', 30, true FROM public.occupations WHERE slug = 'landscaper'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'shrub-pruning-shape-up', 'Shrub pruning & shape-up', 'Hand pruning for health and curb appeal', 'fixed', 40, true FROM public.occupations WHERE slug = 'landscaper'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'spring-flower-planting', 'Spring flower planting', 'Seasonal color rotation and bed prep', 'fixed', 50, true FROM public.occupations WHERE slug = 'landscaper'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'exterior-siding-trim-painting', 'Exterior siding & trim painting', 'Prep, caulking, and weather-ready coatings', 'fixed', 20, true FROM public.occupations WHERE slug = 'painter'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'cabinet-spray-refinish', 'Cabinet spray refinish', 'Factory-smooth cabinet surfaces with prep', 'fixed', 30, true FROM public.occupations WHERE slug = 'painter'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'deck-porch-staining', 'Deck & porch staining', 'Stripping/cleaning, stain, and sealer systems', 'fixed', 40, true FROM public.occupations WHERE slug = 'painter'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'garage-floor-epoxy-coating', 'Garage floor epoxy coating', 'Flake or solid color systems with prep', 'fixed', 50, true FROM public.occupations WHERE slug = 'painter'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'interior-shampoo-extraction', 'Interior shampoo & extraction', 'Seats, carpets, and heavy soil recovery', 'fixed', 20, true FROM public.occupations WHERE slug = 'car-detailer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'paint-decontamination-clay', 'Paint decontamination (clay)', 'Embedded contaminant removal before wax/seal', 'fixed', 30, true FROM public.occupations WHERE slug = 'car-detailer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'trim-plastic-restoration', 'Trim & plastic restoration', 'Faded trim revival and UV dressings', 'fixed', 40, true FROM public.occupations WHERE slug = 'car-detailer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'convertible-top-clean-protect', 'Convertible top clean & protect', 'Fabric/vinyl care and water repellency', 'fixed', 50, true FROM public.occupations WHERE slug = 'car-detailer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'garage-workbench-zone-design', 'Garage workbench zoning', 'Tool zones, storage, and workflow layout', 'fixed', 20, true FROM public.occupations WHERE slug = 'home-organizer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'paper-mail-command-center', 'Paper & mail command center', 'Sorting, filing zones, and action workflows', 'fixed', 30, true FROM public.occupations WHERE slug = 'home-organizer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'seasonal-wardrobe-swap', 'Seasonal wardrobe swap', 'Purge, donate flows, and closet rotation', 'fixed', 40, true FROM public.occupations WHERE slug = 'home-organizer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'home-office-desk-reset', 'Home office desk reset', 'Cable tame, desk zoning, and digital file cues', 'fixed', 50, true FROM public.occupations WHERE slug = 'home-organizer'
ON CONFLICT (occupation_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, pricing_model = EXCLUDED.pricing_model;

-- 2) service_subcategories (occupation-scoped; slug matches occupation_services.slug)
INSERT INTO public.service_subcategories (service_id, occupation_id, slug, name, description, requires_license, sort_order, is_active)
SELECT
  s.id,
  o.id,
  os.slug,
  os.name,
  os.description,
  false,
  os.sort_order,
  true
FROM public.occupation_services os
JOIN public.occupations o ON o.id = os.occupation_id
JOIN public.services s ON s.slug = CASE o.slug
  WHEN 'cleaner' THEN 'cleaning'
  WHEN 'handyman' THEN 'handyman'
  WHEN 'tutor' THEN 'trainer-tutor'
  WHEN 'dog-walker' THEN 'pet-care'
  WHEN 'event-planner' THEN 'event-organizer'
  WHEN 'mover' THEN 'move-help'
  WHEN 'personal-trainer' THEN 'trainer-tutor'
  WHEN 'photographer' THEN 'photography'
  WHEN 'videographer' THEN 'photography'
  WHEN 'dj' THEN 'event-organizer'
  WHEN 'chef' THEN 'event-organizer'
  WHEN 'makeup-artist' THEN 'event-organizer'
  WHEN 'barber' THEN 'handyman'
  WHEN 'mechanic' THEN 'handyman'
  WHEN 'it-technician' THEN 'handyman'
  WHEN 'landscaper' THEN 'handyman'
  WHEN 'snow-removal' THEN 'handyman'
  WHEN 'painter' THEN 'handyman'
  WHEN 'car-detailer' THEN 'handyman'
  WHEN 'home-organizer' THEN 'cleaning'
  ELSE 'handyman'
END AND s.is_active
WHERE os.slug IN (
  'shelf-rail-installation',
  'act-prep-tutoring',
  'real-estate-listing-photography',
  'ecommerce-product-photography',
  'wedding-highlight-film',
  'customer-testimonial-video',
  'short-term-rental-turnover-cleaning',
  'post-renovation-dust-cleaning',
  'brisk-exercise-dog-walks',
  'puppy-potty-training-visits',
  'pet-feeding-medication-rounds',
  'birthday-milestone-party-planning',
  'baby-shower-planning',
  'nonprofit-fundraising-gala',
  'full-residence-packing-service',
  'furniture-disassembly-assembly',
  'donation-and-drop-off-hauling',
  'hiit-conditioning-sessions',
  'marathon-running-coaching',
  'nutrition-habit-coaching',
  'mobility-recovery-sessions',
  'private-party-dj',
  'corporate-gala-dj',
  'karaoke-dj-host',
  'silent-disco-headset-rental-dj',
  'weekly-meal-prep-chef',
  'small-dinner-party-chef',
  'in-home-cooking-class-chef',
  'allergy-aware-menu-chef',
  'natural-everyday-glam',
  'photoshoot-makeup-session',
  'theatrical-character-makeup',
  'private-makeup-lesson',
  'beard-shaping-lineup',
  'textured-crop-fade',
  'senior-gentlemen-haircut',
  'kids-barbershop-haircut',
  'brake-pad-rotor-service',
  'battery-starter-charging-test',
  'tire-mount-balance-rotation',
  'pre-purchase-vehicle-inspection',
  'wifi-coverage-mesh-upgrade',
  'printer-scanner-setup-it',
  'os-reinstall-data-migration-it',
  'streaming-device-smart-tv-setup',
  'mulch-bed-edging-refresh',
  'seasonal-leaf-cleanup',
  'shrub-pruning-shape-up',
  'spring-flower-planting',
  'exterior-siding-trim-painting',
  'cabinet-spray-refinish',
  'deck-porch-staining',
  'garage-floor-epoxy-coating',
  'interior-shampoo-extraction',
  'paint-decontamination-clay',
  'trim-plastic-restoration',
  'convertible-top-clean-protect',
  'garage-workbench-zone-design',
  'paper-mail-command-center',
  'seasonal-wardrobe-swap',
  'home-office-desk-reset'
)
ON CONFLICT (service_id, occupation_id, slug) WHERE occupation_id IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
