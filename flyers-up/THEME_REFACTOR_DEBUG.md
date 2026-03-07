# Flyers Up Theme System Refactor — Debug Output

## STEP 10 — DEBUG OUTPUT

### 1. Theme Source of Truth

**Location:** `contexts/ThemeContext.tsx` + `components/ThemeProviderWrapper.tsx` + `app/layout.tsx`

**How it works:**
- **ThemeProvider** (from ThemeContext) is the single source of truth for light/dark and role (customer/pro).
- **ThemeProviderWrapper** wraps the entire app at the root (`app/layout.tsx`) and derives `mode` from `usePathname()`.
- **ThemeProvider** receives `mode={mode}` (controlled) and manages `theme` (light/dark/system) from localStorage.
- **Blocking script** in `<head>` runs before first paint and applies `.dark` class to `document.documentElement` based on `localStorage.getItem('flyersup:theme')` to prevent flash.
- **Light mode:** `html` does not have `.dark` class.
- **Dark mode:** `html` has `.dark` class.
- **Tailwind:** Uses `darkMode: ['class', '.dark']` so `dark:` variants apply when `.dark` is on an ancestor.

### 2. Removed Conflicting Theme Logic

| Removed / Consolidated | Location |
|------------------------|----------|
| ThemeProvider from AppLayout | `components/layouts/AppLayout.tsx` — now uses root ThemeProvider only |
| theme-pro/theme-customer toggling from FloatingBottomNav | `components/navigation/FloatingBottomNav.tsx` — removed `useEffect` that duplicated ThemeProvider |
| theme-pro/theme-customer toggling from BottomNav | `components/BottomNav.tsx` — same removal |
| RootClassSync | Not used in layout (was already removed per comment) — `RootClassSync.tsx` exists but is dead code |
| `.dark html` invalid selector | `app/globals.css` — fixed to `html.dark` and `html.dark body` |

### 3. Semantic Theme Tokens (from globals.css)

**Light theme:**
- App background: `--bg` → #F5F5F5
- Card background: `--surface` → #FFFFFF
- Primary text: `--text` → #111111
- Secondary text: `--text-2`, `--text-3`, `--text-muted` → #6B7280
- Border: `--border` → #E5E5E5
- Muted surface: `--surface-2` → #F8F8F8

**Dark theme:**
- App background: `--bg` → #0F1115
- Card background: `--surface` → #171A20
- Primary text: `--text` → #F5F7FA
- Secondary text: `--text-2`, `--text-muted` → #A1A8B3
- Border: `--border` → rgba(255,255,255,0.08)
- Muted surface: `--surface-2` → #1D2128

**Tailwind utilities:** `bg-bg`, `bg-surface`, `bg-surface2`, `text-text`, `text-muted`, `border-border`

### 4. Files Updated

| File | Changes |
|------|---------|
| `app/layout.tsx` | Added ThemeProviderWrapper, blocking script, semantic classes (bg-bg, text-text) |
| `app/globals.css` | Fixed html/body to use CSS variables; fixed `.dark html` → `html.dark` |
| `components/ThemeProviderWrapper.tsx` | **NEW** — Root-level wrapper that derives mode from pathname |
| `contexts/ThemeContext.tsx` | Added controlled `mode` prop for pathname-driven role |
| `components/layouts/AppLayout.tsx` | Removed ThemeProvider; switched to semantic tokens (bg-bg, text-text) |
| `components/navigation/FloatingBottomNav.tsx` | Removed document.documentElement theme-pro/theme-customer toggling |
| `components/BottomNav.tsx` | Same removal |
| `components/customer/CustomerPageShell.tsx` | Semantic tokens (bg-bg, text-text, text-muted, border-border, bg-surface2) |
| `components/pro/ProPageShell.tsx` | Same + fixed missing dark variant on title |
| `components/ui/SideMenu.tsx` | Semantic tokens (bg-surface, text-text, text-muted, border-border) |
| `components/ui/Rail.tsx` | Semantic tokens |
| `components/ui/Card.tsx` | CARD_BASE → bg-surface, border-border |
| `components/PageLayout.tsx` | Semantic tokens |
| `components/messages/EmptyState.tsx` | Semantic tokens |
| `components/messages/ConversationCard.tsx` | Semantic tokens |
| `app/(app)/customer/messages/page.tsx` | Fixed loading text (added dark variant) |
| `app/(app)/pro/messages/[conversationId]/page.tsx` | text-text, text-muted |
| `components/ui/Timeline.tsx` | text-text, text-muted |
| `components/checkout/StickyPayBar.tsx` | Semantic tokens, removed inline style |
| `app/(app)/pro/layout.tsx` | bg-bg, text-text |

### 5. Verification Checklist

- [x] ThemeProvider at root wraps entire app
- [x] Blocking script prevents theme flash
- [x] Light mode: no `.dark` on html
- [x] Dark mode: `.dark` on html
- [x] Components use semantic tokens (bg-bg, bg-surface, text-text, text-muted, border-border)
- [x] Bottom nav uses dark: variants (already theme-aware)
- [x] Sidebar/SideMenu uses semantic tokens
- [x] Messages and Settings pages use semantic tokens
- [x] No duplicate theme-pro/theme-customer toggling
