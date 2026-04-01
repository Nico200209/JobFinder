# Phase 2 — Layout & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the persistent app shell — sidebar, mobile nav, page wrapper, and UI primitives — that all future JobRadar pages compose from.

**Architecture:** Uses Next.js route groups: `(app)/layout.tsx` wraps all authenticated pages with the shell; `(auth)/login` stays outside the shell. Custom Tailwind for all layout and card primitives; shadcn/ui (Input + Dialog only) installed manually without running `shadcn init` to avoid overwriting the existing tailwind config and globals.css.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui Input + Dialog, lucide-react (already installed), clsx + tailwind-merge (to install).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/utils.ts` | Create | `cn()` helper used by all components |
| `components.json` | Create | shadcn config (tells `shadcn add` where to put things) |
| `src/components/ui/input.tsx` | Create | shadcn Input, themed dark |
| `src/components/ui/dialog.tsx` | Create | shadcn Dialog, themed dark |
| `src/components/ui/Button.tsx` | Create | 4 variants, 3 sizes, forwardRef |
| `src/components/ui/Card.tsx` | Create | Dark card with composable sub-components |
| `src/components/ui/Badge.tsx` | Create | Job status color-coded pill |
| `src/components/ui/ScoreBadge.tsx` | Create | Match % badge (green/yellow/red) |
| `src/components/ui/Skeleton.tsx` | Create | Shimmer loader |
| `src/components/layout/Sidebar.tsx` | Create | Full labeled sidebar, collapsible |
| `src/components/layout/MobileNav.tsx` | Create | Bottom tab bar, pill active state |
| `src/components/layout/PageWrapper.tsx` | Create | Hero header wrapper |
| `src/app/(auth)/login/page.tsx` | Create | Login page moved into auth group |
| `src/app/(app)/layout.tsx` | Create | Shell layout: Sidebar + MobileNav |
| `src/app/(app)/dashboard/page.tsx` | Create | Dashboard (placeholder → PageWrapper + Skeletons) |
| `src/app/(app)/jobs/page.tsx` | Create | Jobs stub (Phase 5) |
| `src/app/(app)/board/page.tsx` | Create | Board stub (Phase 9) |
| `src/app/(app)/settings/page.tsx` | Create | Settings stub (Phase 10) |
| `src/app/login/page.tsx` | Delete | Replaced by `(auth)/login/page.tsx` |
| `src/app/dashboard/page.tsx` | Delete | Replaced by `(app)/dashboard/page.tsx` |
| `src/app/layout.tsx` | No change | Root layout stays as-is |
| `middleware.ts` | No change | URL paths don't change with route groups |

> **Note on route groups:** Folders wrapped in `()` are route groups — they don't affect URLs. `/login` and `/dashboard` remain the same URLs. The middleware and all redirects continue to work unchanged.

---

## Task 1: Install dependencies and create `cn()` utility

**Files:**
- Modify: `package.json` (adds clsx, tailwind-merge)
- Create: `src/lib/utils.ts`
- Create: `components.json`

- [ ] **Step 1: Install clsx and tailwind-merge**

```bash
cd /Users/nicolasgarcia/Documents/JobFinder
npm install clsx tailwind-merge
```

Expected output: `added 2 packages` (no errors)

- [ ] **Step 2: Create `src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Create `components.json` (shadcn config) at project root**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": false,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

> `cssVariables: false` prevents shadcn from injecting CSS variable blocks into globals.css, which would conflict with the existing custom color tokens.

- [ ] **Step 4: Verify TypeScript resolves the new file**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to utils.ts)

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts components.json package.json package-lock.json
git commit -m "feat: add cn() utility and shadcn config"
```

---

## Task 2: Install shadcn Input and Dialog

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Add shadcn Input component**

```bash
npx shadcn@latest add input --yes
```

Expected: creates `src/components/ui/input.tsx`

- [ ] **Step 2: Theme the Input to dark design system**

Open `src/components/ui/input.tsx`. Replace the entire file content with:

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100',
          'placeholder:text-zinc-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 3: Add shadcn Dialog component**

```bash
npx shadcn@latest add dialog --yes
```

Expected: creates `src/components/ui/dialog.tsx`

- [ ] **Step 4: Theme the Dialog overlay and panel**

Open `src/components/ui/dialog.tsx`. Find `DialogOverlay` and update its `className` to:

```
'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
```

Find `DialogContent` and update its `className` to:

```
'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-zinc-900 border border-white/5 rounded-xl p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
```

- [ ] **Step 5: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/dialog.tsx
git commit -m "feat: add shadcn Input and Dialog with dark theme"
```

---

## Task 3: Build Button component

**Files:**
- Create: `src/components/ui/Button.tsx`

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```tsx
'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
  ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100',
  destructive: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat: add Button component with 4 variants and 3 sizes"
```

---

## Task 4: Build Card component

**Files:**
- Create: `src/components/ui/Card.tsx`

- [ ] **Step 1: Create `src/components/ui/Card.tsx`**

```tsx
import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean
}

export function Card({ clickable, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-zinc-900 border border-white/5 rounded-xl p-4',
        clickable && 'hover:border-white/10 transition-colors cursor-pointer',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between mb-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-medium text-zinc-100', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props} />
}
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Card.tsx
git commit -m "feat: add Card component with composable sub-components"
```

---

## Task 5: Build Badge and ScoreBadge components

**Files:**
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/ScoreBadge.tsx`

- [ ] **Step 1: Create `src/components/ui/Badge.tsx`**

```tsx
import { cn } from '@/lib/utils'

export type JobStatus =
  | 'new' | 'reviewing' | 'applied' | 'interview'
  | 'offer' | 'rejected' | 'ghosted' | 'saved' | 'archived'

const statusClasses: Record<JobStatus, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  reviewing: 'bg-yellow-500/10 text-yellow-400',
  applied: 'bg-purple-500/10 text-purple-400',
  interview: 'bg-emerald-500/10 text-emerald-400',
  offer: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
  ghosted: 'bg-zinc-500/10 text-zinc-400',
  saved: 'bg-blue-500/10 text-blue-300',
  archived: 'bg-zinc-700/50 text-zinc-500',
}

const statusLabels: Record<JobStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
  saved: 'Saved',
  archived: 'Archived',
}

interface BadgeProps {
  status: JobStatus
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        statusClasses[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
```

- [ ] **Step 2: Create `src/components/ui/ScoreBadge.tsx`**

```tsx
import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | 'language_barrier'
  className?: string
}

function getScoreClasses(score: number | 'language_barrier'): string {
  if (score === 'language_barrier') return 'bg-zinc-500/10 text-zinc-500'
  if (score >= 0.85) return 'bg-emerald-400/10 text-emerald-400'
  if (score >= 0.6) return 'bg-yellow-400/10 text-yellow-400'
  return 'bg-red-400/10 text-red-400'
}

function formatScore(score: number | 'language_barrier'): string {
  if (score === 'language_barrier') return 'Lang ✗'
  return `${Math.round(score * 100)}%`
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono',
        getScoreClasses(score),
        className
      )}
    >
      {formatScore(score)}
    </span>
  )
}
```

- [ ] **Step 3: Verify type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Badge.tsx src/components/ui/ScoreBadge.tsx
git commit -m "feat: add Badge and ScoreBadge components"
```

---

## Task 6: Build Skeleton component

**Files:**
- Create: `src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create `src/components/ui/Skeleton.tsx`**

```tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-zinc-800 rounded animate-pulse', className)} />
}
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Skeleton.tsx
git commit -m "feat: add Skeleton shimmer loader component"
```

---

## Task 7: Build Sidebar component

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create `src/components/layout/Sidebar.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  Settings2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/board', label: 'Board', icon: KanbanSquare },
  { href: '/settings', label: 'Settings', icon: Settings2 },
] as const

const STORAGE_KEY = 'jobradar:sidebar-collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  // Restore collapse state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col flex-shrink-0 h-screen bg-zinc-950 border-r border-zinc-800',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2.5 h-14 border-b border-zinc-800 flex-shrink-0',
          collapsed ? 'justify-center' : 'px-4'
        )}
      >
        <div className="w-6 h-6 bg-blue-500 rounded-md flex-shrink-0" />
        {!collapsed && (
          <span className="font-bold text-white text-sm">JobRadar</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
                collapsed && 'justify-center',
                active
                  ? 'bg-blue-500/10 text-blue-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2">
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center justify-center w-full py-1.5 rounded-lg',
            'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center border-t border-zinc-800 p-3',
          collapsed ? 'justify-center' : 'gap-2'
        )}
      >
        {!collapsed && (
          <>
            <div className="w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium text-zinc-300 flex-shrink-0">
              NG
            </div>
            <span className="text-xs text-zinc-400 truncate flex-1">
              Nicolás García
            </span>
          </>
        )}
        <button
          onClick={signOut}
          title="Sign out"
          className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Sidebar component with collapse and active state"
```

---

## Task 8: Build MobileNav component

**Files:**
- Create: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create `src/components/layout/MobileNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/board', label: 'Board', icon: KanbanSquare },
  { href: '/settings', label: 'Settings', icon: Settings2 },
] as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-zinc-950 border-t border-zinc-800 flex justify-around items-center px-2 py-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors',
              active
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileNav.tsx
git commit -m "feat: add MobileNav bottom tab bar with pill active state"
```

---

## Task 9: Build PageWrapper component

**Files:**
- Create: `src/components/layout/PageWrapper.tsx`

- [ ] **Step 1: Create `src/components/layout/PageWrapper.tsx`**

```tsx
import { ReactNode } from 'react'

interface PageWrapperProps {
  label: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function PageWrapper({
  label,
  title,
  subtitle,
  action,
  children,
}: PageWrapperProps) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero header */}
      <div className="px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
              {label}
            </p>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0 mt-5">{action}</div>}
        </div>
        <hr className="border-zinc-800 mt-6" />
      </div>

      {/* Page content */}
      <div className="px-6 py-6 flex-1">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/PageWrapper.tsx
git commit -m "feat: add PageWrapper hero header component"
```

---

## Task 10: Restructure routes into groups and build app shell layout

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/jobs/page.tsx`
- Create: `src/app/(app)/board/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Delete: `src/app/login/page.tsx` (and directory)
- Delete: `src/app/dashboard/page.tsx` (and directory)

- [ ] **Step 1: Create `src/app/(auth)/login/page.tsx`**

Copy the login page content exactly. This is an identical file move — only the location changes:

```tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign in — JobRadar',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 ring-1 ring-accent-blue/20">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-blue"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            JobRadar
          </h1>
          <p className="mt-1 text-sm text-white/40">Sign in to your dashboard</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-background-card p-6 shadow-card">
          <Suspense
            fallback={<div className="h-48 animate-pulse rounded-lg bg-white/5" />}
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Delete the old login directory**

```bash
rm -rf src/app/login
```

- [ ] **Step 3: Create `src/app/(app)/layout.tsx`**

```tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 min-w-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/(app)/dashboard/page.tsx`**

```tsx
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  return (
    <PageWrapper
      label="Overview"
      title="Dashboard"
      subtitle="Your job search at a glance"
    >
      {/* Stat cards skeleton — replaced in Phase 7 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Priority queue skeleton */}
      <div className="mt-8">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
```

- [ ] **Step 5: Delete the old dashboard directory**

```bash
rm -rf src/app/dashboard
```

- [ ] **Step 6: Create stub pages for remaining app routes**

Create `src/app/(app)/jobs/page.tsx`:

```tsx
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function JobsPage() {
  return (
    <PageWrapper label="Listings" title="Jobs" subtitle="Coming in Phase 5">
      <p className="text-zinc-500 text-sm">Job listings will appear here.</p>
    </PageWrapper>
  )
}
```

Create `src/app/(app)/board/page.tsx`:

```tsx
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function BoardPage() {
  return (
    <PageWrapper label="Tracker" title="Board" subtitle="Coming in Phase 9">
      <p className="text-zinc-500 text-sm">Kanban board will appear here.</p>
    </PageWrapper>
  )
}
```

Create `src/app/(app)/settings/page.tsx`:

```tsx
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function SettingsPage() {
  return (
    <PageWrapper label="Config" title="Settings" subtitle="Coming in Phase 10">
      <p className="text-zinc-500 text-sm">Settings will appear here.</p>
    </PageWrapper>
  )
}
```

- [ ] **Step 7: Verify type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/app/
git commit -m "feat: restructure routes into groups, build app shell layout"
```

---

## Task 11: End-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with no compilation errors in terminal

- [ ] **Step 2: Test unauthenticated redirect**

Open http://localhost:3000/dashboard in an incognito window.

Expected: redirected to http://localhost:3000/login?redirectTo=/dashboard

- [ ] **Step 3: Test login page**

Expected: login page renders correctly — centered card, JobRadar logo, email + password fields, no sidebar visible.

- [ ] **Step 4: Log in**

Use the credentials created during Phase 1. After login:

Expected: redirected to `/dashboard`, sidebar visible on left with "Dashboard" link highlighted in blue.

- [ ] **Step 5: Test sidebar navigation**

Click each nav link (Jobs, Board, Settings).

Expected: URL changes, active link highlights in blue, page content changes to the stub page for that route.

- [ ] **Step 6: Test sidebar collapse**

Click the ChevronLeft button at the bottom of the sidebar.

Expected: sidebar collapses to 56px, only icons visible. Refresh the page — sidebar remains collapsed (localStorage persisted).

Click ChevronRight to expand. Refresh — sidebar remains expanded.

- [ ] **Step 7: Test mobile layout (375px)**

Open DevTools → toggle device toolbar → set to 375px width.

Expected: sidebar is hidden, bottom tab bar visible with 4 icons + labels. Active tab has blue pill background.

- [ ] **Step 8: Test Dashboard PageWrapper**

Expected: "OVERVIEW" label, "Dashboard" title, "Your job search at a glance" subtitle, 4 skeleton cards, 5 skeleton list items — all pulsing.

- [ ] **Step 9: Commit verification**

```bash
git add -A
git commit -m "Phase 2 complete — Layout & Navigation"
```

---

## Verification Checklist (from spec)

- [ ] `npm run dev` starts without errors
- [ ] Unauthenticated visit to `/dashboard` → redirects to `/login`
- [ ] After login → sidebar visible on desktop, no sidebar on mobile
- [ ] Sidebar collapses to icon-only; state persists on page refresh
- [ ] All 4 nav links navigate correctly and highlight the active route
- [ ] On mobile (375px): sidebar hidden, bottom tab bar visible with pill active state
- [ ] `PageWrapper` renders label, title, subtitle, and action slot correctly
- [ ] All UI primitives render without TypeScript errors
- [ ] shadcn Input and Dialog render with dark theme
- [ ] Dashboard page shows real `PageWrapper` layout (not old placeholder text)
