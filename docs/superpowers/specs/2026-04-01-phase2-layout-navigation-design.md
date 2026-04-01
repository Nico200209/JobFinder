# Phase 2 — Layout & Navigation Design Spec

**Date:** 2026-04-01
**Project:** JobRadar
**Phase:** 2 of 11

---

## Context

Phase 1 established auth, Supabase clients, middleware, and the login page. Phase 2 builds the persistent app shell — the layout, navigation, and UI primitive components that every future page will be built on top of. Nothing in this phase fetches real job data; it establishes the visual and structural foundation.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sidebar style | Full labeled, collapsible to icon-only | Always-readable labels; collapses when user wants more space |
| Mobile nav | Bottom tab bar with pill active highlight | Consistent active-state visual language with desktop sidebar |
| Page header | Hero header with section label + subtitle/stats | Gives each page personality; subtitle line useful for live stats |
| Implementation approach | Custom Tailwind for layout/nav/cards; shadcn for Input + Modal only | shadcn fights customization on nav components; saves time on accessibility-complex primitives |

---

## Section 1 — File Structure

### New files

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx         # MOVED here (no shell layout)
│   └── (app)/
│       ├── layout.tsx           # NEW: shell layout (sidebar + mobile nav)
│       └── dashboard/
│           └── page.tsx         # MOVED here (gets shell automatically)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Full labeled sidebar, collapsible
│   │   ├── MobileNav.tsx        # Bottom tab bar with pill active state
│   │   └── PageWrapper.tsx      # Hero header wrapper for all pages
│   └── ui/
│       ├── Button.tsx           # primary / secondary / ghost / destructive
│       ├── Card.tsx             # Dark bg, subtle border, rounded-xl
│       ├── Badge.tsx            # Job status color-coded pill
│       ├── ScoreBadge.tsx       # Match % badge (green/yellow/red)
│       └── Skeleton.tsx         # Shimmer placeholder loader
└── lib/
    └── utils.ts                 # NEW: cn() helper (created by shadcn init)
```

### Updated files

```
src/app/layout.tsx               # Root layout stays minimal — AuthProvider only, no shell logic
```

### shadcn components (installed via CLI, source copied in)

```
src/components/ui/input.tsx      # Themed to dark design system
src/components/ui/dialog.tsx     # Modal with focus trap + ARIA
```

### Why route groups

Next.js App Router `layout.tsx` files are Server Components — `usePathname()` is unavailable. The idiomatic solution is **route groups** (folders wrapped in parentheses). `(app)/layout.tsx` applies the shell to all app routes; `(auth)/login` gets no shell. No path-checking hack required. The root `app/layout.tsx` keeps its current responsibility: `<html>`, fonts, `AuthProvider`.

---

## Section 2 — Layout Shell

`app/layout.tsx` stays unchanged — it only provides `<html>`, fonts, and `AuthProvider`. The shell lives in `app/(app)/layout.tsx`, which applies automatically to all routes inside the `(app)` route group.

### Shell layout (`app/(app)/layout.tsx`)

```
(app)/layout.tsx
├── <Sidebar />          desktop left rail, 220px, 'use client'
├── <main>               flex-1, overflow-y-auto, pb-20 lg:pb-0 (space for mobile nav)
│   └── {children}
└── <MobileNav />        fixed bottom bar, 'use client', hidden on lg+
```

### Route group structure

```
app/
├── layout.tsx           # Root: <html>, fonts, AuthProvider
├── (auth)/
│   └── login/
│       └── page.tsx     # No shell — outside (app) group
└── (app)/
    ├── layout.tsx        # Shell: Sidebar + MobileNav wrapper
    ├── dashboard/
    │   └── page.tsx
    ├── jobs/
    │   └── page.tsx
    ├── board/
    │   └── page.tsx
    └── settings/
        └── page.tsx
```

- `Sidebar` and `MobileNav` are `'use client'` (need `usePathname()` for active state).
- `(app)/layout.tsx` itself is a Server Component — just renders the shell structure.
- Mobile breakpoint: `lg` (1024px). Below `lg`: sidebar hidden, MobileNav visible. Above `lg`: MobileNav hidden, sidebar visible.

---

## Section 3 — Sidebar Component

**File:** `src/components/layout/Sidebar.tsx`
**Directive:** `'use client'`

### Props
None — reads active path from `usePathname()`, reads user from `useAuth()`.

### Layout (top → bottom)
1. **Header** — Blue `#3B82F6` square icon (16×16, rounded-md) + "JobRadar" wordmark (font-bold text-white). Clicking navigates to `/dashboard`.
2. **Nav links** — Dashboard, Jobs, Board, Settings with lucide-react icons (LayoutDashboard, Briefcase, KanbanSquare, Settings2).
3. **Collapse toggle** — ChevronLeft/ChevronRight icon button at bottom of nav. Toggles between expanded (220px) and collapsed (56px).
4. **Footer** — User initials avatar (bg-zinc-700, rounded-full) + name "Nicolás García" + LogOut icon button.

### Active state
- Active: `bg-blue-500/10 text-blue-400 font-medium`
- Inactive: `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800`
- Both: `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors`

### Collapsed state
- Width transitions: `transition-all duration-200 ease-in-out`
- Collapsed: icons only, labels hidden (`opacity-0 w-0 overflow-hidden`)
- Tooltips on icon hover showing the link label (`title` attribute)
- Footer: logout icon only, name hidden
- Collapse state persisted: `localStorage` key `jobradar:sidebar-collapsed`

---

## Section 4 — MobileNav Component

**File:** `src/components/layout/MobileNav.tsx`
**Directive:** `'use client'`

### Layout
Fixed bottom bar: `fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 flex justify-around items-center px-2 py-2 lg:hidden`

### Tab items
Dashboard, Jobs, Board, Settings — same icons as sidebar.

### Active state
Active tab gets pill background: `bg-blue-500/10 rounded-xl px-3 py-1.5`
- Active icon + label: `text-blue-400`
- Inactive: `text-zinc-500`

### Structure per tab
```
<button className="flex flex-col items-center gap-1">
  <Icon size={20} />
  <span className="text-[10px] font-medium">Label</span>
</button>
```

---

## Section 5 — PageWrapper Component

**File:** `src/components/layout/PageWrapper.tsx`
**Directive:** Server Component (no hooks needed)

### Props

```ts
interface PageWrapperProps {
  label: string        // Small uppercase section label, e.g. "Overview"
  title: string        // Large page title, e.g. "Dashboard"
  subtitle?: string    // Live stats line, e.g. "47 jobs · 12 high match"
  action?: ReactNode   // Action button slot (right-aligned)
  children: ReactNode
}
```

### Layout

```
[label]
[title]                              [action]
[subtitle]
─────────────────────────────────────────────
[children]
```

- `label`: `text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1`
- `title`: `text-2xl font-bold text-white`
- `subtitle`: `text-sm text-zinc-500 mt-1`
- `action`: absolutely positioned or flex row end, `hidden sm:block` on mobile stacks below
- Divider: `<hr className="border-zinc-800 my-6" />`

---

## Section 6 — UI Primitives

### Button (`src/components/ui/Button.tsx`)

Variants via `variant` prop:

| Variant | Classes |
|---------|---------|
| `primary` (default) | `bg-blue-500 hover:bg-blue-600 text-white` |
| `secondary` | `bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700` |
| `ghost` | `hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100` |
| `destructive` | `bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20` |

Sizes: `sm` (px-3 py-1.5 text-xs), `md` (px-4 py-2 text-sm, default), `lg` (px-5 py-2.5 text-base)

Shared: `rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`

Forwards all native `<button>` props. No external deps.

---

### Card (`src/components/ui/Card.tsx`)

```
bg-zinc-900 border border-white/5 rounded-xl p-4
```

Clickable variant adds: `hover:border-white/10 transition-colors cursor-pointer`

Exports: `Card`, `CardHeader`, `CardTitle`, `CardContent` — composable sub-components.

---

### Badge (`src/components/ui/Badge.tsx`)

Job status color map:

| Status | Colors |
|--------|--------|
| `new` | `bg-blue-500/10 text-blue-400` |
| `reviewing` | `bg-yellow-500/10 text-yellow-400` |
| `applied` | `bg-purple-500/10 text-purple-400` |
| `interview` | `bg-emerald-500/10 text-emerald-400` |
| `offer` | `bg-green-500/10 text-green-400` |
| `rejected` | `bg-red-500/10 text-red-400` |
| `ghosted` | `bg-zinc-500/10 text-zinc-400` |
| `saved` | `bg-blue-500/10 text-blue-300` |
| `archived` | `bg-zinc-700/50 text-zinc-500` |

Shared: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`

---

### ScoreBadge (`src/components/ui/ScoreBadge.tsx`)

Accepts `score: number` (0–1) or `"language_barrier"`.

| Range | Colors |
|-------|--------|
| ≥ 0.85 | `bg-emerald-400/10 text-emerald-400` |
| 0.60–0.84 | `bg-yellow-400/10 text-yellow-400` |
| < 0.60 | `bg-red-400/10 text-red-400` |
| `"language_barrier"` | `bg-zinc-500/10 text-zinc-500` |

Displays as percentage string (`Math.round(score * 100) + '%'`). Uses `font-mono` (Geist Mono).

---

### Skeleton (`src/components/ui/Skeleton.tsx`)

```tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-zinc-800 rounded animate-pulse', className)} />
}
```

Caller controls size via `className` (e.g. `h-4 w-32`). Uses `cn()` from `src/lib/utils.ts` (created by `npx shadcn@latest init`). No other deps.

---

### Input (shadcn — `src/components/ui/input.tsx`)

Override CSS variables:
- Background: `bg-zinc-900`
- Border: `border-zinc-700 focus:border-blue-500`
- Ring: `focus-visible:ring-blue-500/20`
- Text: `text-zinc-100 placeholder:text-zinc-500`

---

### Dialog (shadcn — `src/components/ui/dialog.tsx`)

Override:
- Overlay: `bg-black/60 backdrop-blur-sm`
- Panel: `bg-zinc-900 border border-white/5 rounded-xl shadow-2xl`

---

## Verification

After Phase 2 is implemented, verify:

1. `npm run dev` starts without errors
2. Unauthenticated visit to `/dashboard` → redirects to `/login`
3. After login → sidebar visible on desktop, no sidebar on mobile
4. Sidebar collapses to icon-only; state persists on page refresh
5. All 4 nav links navigate correctly and highlight the active route
6. On mobile (375px): sidebar hidden, bottom tab bar visible with pill active state
7. `PageWrapper` renders label, title, subtitle, and action slot correctly
8. All UI primitives render without TypeScript errors: Button (all variants), Card, Badge (all statuses), ScoreBadge (all ranges), Skeleton
9. shadcn Input and Dialog render with dark theme (no light mode flash)
10. Dashboard page shows real PageWrapper layout (not the placeholder text)
