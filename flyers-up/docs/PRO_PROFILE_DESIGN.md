# Pro Profile Page — Design Document

## 1. Page Structure

Section order (conversion-focused, highest-conviction first):

| # | Section | Purpose |
|---|---------|---------|
| 1 | Hero / identity block | Photo, name, verification, stats |
| 2 | Trust badges / verification | Visible early for trust |
| 3 | Services + pricing | **Highest conviction** |
| 4 | Reviews summary + review cards | **Highest conviction** |
| 5 | Gallery / work samples | Portfolio proof |
| 6 | Availability preview | "Check availability" CTA |
| 7 | About / service area | Bio, location, radius |
| 8 | Sticky CTA | Book primary, Message supportive |

---

## 2. Component Breakdown

| Component | Purpose | Reference |
|-----------|---------|-----------|
| `ProProfileTopBar` | Back, title, Message, Share | Etsy header |
| `ProfileHeroCard` | Photo + verification, name, Top Rated, stats | Airbnb host |
| `TrustBadgesRow` | Guidelines, insurance, background, payments | Etsy policies |
| `ServicesAndPricingSection` | Combined pricing + service list | Stripe clarity |
| `ProReviewSection` | Summary, distribution, highlight tags, review cards | Airbnb reviews |
| `GallerySection` | Tabs (All \| Before/After), 2-col grid | Swiggy gallery |
| `AvailabilityPreviewCard` | Summary + "Check availability" link | Hopper calendar |
| `AboutServiceAreaSection` | Bio, location, service radius, Read more | Airbnb + Etsy |
| `StickyBookingBar` | Book (primary), Message (supportive), Share | — |

---

## 3. Mobile vs Desktop Layout

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| Layout | Single column, full width | Max 720px centered |
| Top bar | Sticky, compact | Sticky, same |
| Hero | Stacked photo + stats | Same |
| Sticky CTA | Book dominant, Message icon-only (44px) | Book dominant, Message with label |
| Touch targets | 44px min | Same |
| Bottom padding | 36 (above sticky CTA) | Same |

### Sticky CTA hierarchy
- **Book**: Primary, flex-1, accent background
- **Message**: Supportive, icon-only on mobile, ghost style
- **Share**: Tertiary, icon-only

---

## 4. Loading / Empty / Error States

### Loading
- Skeleton blocks for hero, trust, services, gallery
- Matches layout structure

### Empty
- **Gallery**: "No work photos yet. When photos are added, they'll show here."
- **Reviews**: ProReviewSection handles empty ("No reviews yet")
- **About/Service area**: Section hidden if no content

### Error
- `error.tsx`: "Something went wrong" + Try again + Go home

---

## 5. Style Direction

- **Airbnb** — Warmth, reviews, personal bio, verification
- **Stripe** — Clarity, pricing transparency, minimal copy
- **Apple** — Polish, rounded corners, subtle shadows
- **Linear** — Spacing precision, clear hierarchy

### Avoid
- Social-media-like feeds
- Ecommerce-heavy product grids
- Dashboard-style dense layouts
- Text-dense blocks
