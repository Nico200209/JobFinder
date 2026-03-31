# JobRadar — Project Rules for Claude

> **Project**: JobRadar — Personalized Job Hunting Dashboard for Nicolás García
> **Stack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase, Vercel
> **Budget constraint**: Everything MUST be free tier — hosting, database, job data, email

---

## Context

You are building a full-stack job hunting web application called **JobRadar** for a single user (Nicolás García). This is NOT a SaaS — it is a personal tool with invite-only auth. The entire project MUST run on free tiers: Vercel (hobby), Supabase (free), and free job APIs.

### The User's Profile & Situation
- **Name**: Nicolás García
- **Education**: Creative Media and Game Technologies, Saxion University (2020–2025), Netherlands
- **Hard Skills**: React, HTML/CSS/JavaScript, TypeScript, C#, Unity, Figma, Git, Nuke, Postman
- **Soft Skills**: System design, technical documentation, project management (Agile/Scrum), stakeholder communication
- **Languages**: English (fluent), Spanish (native)
- **Does NOT speak**: Dutch
- **Current location**: Netherlands (relocating to Dominican Republic soon)
- **Target location for jobs**: Remote-first, USD-paying roles. Open to on-site in Santo Domingo, DR. Open to remote roles from companies worldwide.
- **Experience**: Technical game designer, team leader, UI/UX redesign, educational system prototyping, freelance React websites (Fiverr), video editing for paid social ads
- **Portfolio**: nicolasgarciapaetz.com

### Job Search Criteria (used for scoring)
The user is looking for jobs in THREE main categories, plus an open "wildcard" category:

1. **Game Designer / Technical Game Designer** — interaction design, system design, GDD/FDD documentation, Unity prototyping, UX for games
2. **Low-Code / No-Code Traineeships or Junior Roles** — platforms like Mendix, OutSystems, Bubble, Retool, PowerApps — BUT only if English-speaking
3. **Frontend Developer / React Developer** — junior or mid-level, React/Next.js, TypeScript, Tailwind, freelance or employment
4. **Wildcard** — any tech role that matches 70%+ of the user's skills (e.g., UX designer, product designer, creative technologist, technical writer, QA with game background)

### Scoring Priority Factors (for the job match algorithm)

| Factor | Weight | Logic |
|--------|--------|-------|
| Skill match | 30% | How many of the user's hard skills appear in the job description |
| Language requirement | 20% | English-only or Spanish = max score. Dutch required = 0. Bilingual bonus if both EN+ES |
| Remote availability | 15% | Fully remote = max. Hybrid with remote option = mid. On-site only = low (unless Santo Domingo/DR) |
| Seniority fit | 10% | Junior, trainee, entry-level, mid-level = max. Senior/lead with 5+ years required = 0 |
| Salary potential | 10% | USD-paying or EUR-paying remote > local DR salary. Freelance/contract hourly rates preferred |
| Company reputation | 5% | Known companies, funded startups, or agencies with portfolio > unknown entities |
| Location match | 5% | DR-based, remote-global, US-remote, EU-remote = good. On-site Netherlands (Dutch required) = bad |
| Growth opportunity | 5% | Mentions mentorship, learning, career path = bonus |

**Threshold rules:**
- Score ≥ 85% → Save to DB + send email notification immediately
- Score 60–84% → Save to DB, mark as "Review Later", no email
- Score < 60% → Save to DB, mark as "Low Match", no email
- Dutch language required → auto-score 0%, save but mark as "Language Barrier"

### Priority System for Application Order
After scoring, jobs are ranked by a **priority score** combining:
1. Match score (weight: 50%)
2. Posting freshness — newer = higher priority (weight: 25%)
3. Application deadline proximity — closer deadline = higher priority (weight: 15%)
4. Company tier — known/funded > unknown (weight: 10%)

---

## Role

You are a senior full-stack engineer specializing in Next.js, TypeScript, and Supabase. You write clean, component-based, well-documented code. You prioritize security, type safety, and maintainability. You build features incrementally — one working piece at a time. You NEVER dump an entire codebase at once. You treat this as a real production app.

Only make changes directly requested. Do not add features or refactor beyond what was asked.

---

## Architecture & Technical Decisions (LOCKED — do not change)

### Project Structure
```
jobradar/
├── .env.local                    # All secrets — NEVER committed
├── .gitignore                    # Already created
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── middleware.ts                  # Auth guard — protects ALL routes
├── supabase/
│   └── migrations/               # SQL migration files
└── src/
    ├── app/
    │   ├── layout.tsx            # Root layout with auth provider
    │   ├── page.tsx              # Redirects to /dashboard or /login
    │   ├── login/
    │   │   └── page.tsx          # Login page (NO registration)
    │   ├── dashboard/
    │   │   └── page.tsx          # Main dashboard — overview + stats
    │   ├── jobs/
    │   │   ├── page.tsx          # All job listings with filters
    │   │   └── [id]/
    │   │       └── page.tsx      # Individual job detail + actions
    │   ├── board/
    │   │   └── page.tsx          # Kanban/Trello-style tracker
    │   ├── settings/
    │   │   └── page.tsx          # Search criteria, notification prefs
    │   └── api/
    │       ├── jobs/
    │       │   ├── scrape/
    │       │   │   └── route.ts  # Cron endpoint — fetch + score jobs
    │       │   └── [id]/
    │       │       └── route.ts  # Update job status
    │       └── notify/
    │           └── route.ts      # Send email notifications
    ├── components/
    │   ├── ui/                   # Reusable UI primitives (Button, Card, Badge, Modal, Input)
    │   ├── layout/               # Sidebar, Navbar, MobileNav, PageWrapper
    │   ├── dashboard/            # StatCard, RecentJobs, MatchChart, PriorityQueue
    │   ├── jobs/                 # JobCard, JobList, JobFilters, JobDetail, ScoreBadge
    │   ├── board/                # KanbanBoard, KanbanColumn, KanbanCard, DragProvider
    │   └── auth/                 # LoginForm, AuthProvider, ProtectedRoute
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts         # Browser Supabase client
    │   │   ├── server.ts         # Server Supabase client
    │   │   └── admin.ts          # Service role client (for creating users)
    │   ├── scoring.ts            # Job match scoring algorithm
    │   ├── priority.ts           # Priority ranking logic
    │   ├── scraper.ts            # Job fetching from free APIs
    │   ├── email.ts              # Email notification sender
    │   └── utils.ts              # General helpers
    ├── types/
    │   └── index.ts              # All TypeScript interfaces/types
    └── hooks/
        ├── useJobs.ts            # Job data fetching hook
        ├── useBoard.ts           # Kanban state management
        └── useAuth.ts            # Auth state hook
```

### Database Schema (Supabase PostgreSQL)

```sql
-- Users table (managed by Supabase Auth, no public signup)
-- Accounts are created ONLY via Supabase Admin API or SQL insert

-- Jobs table
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo_url TEXT,
  location TEXT,
  remote_type TEXT CHECK (remote_type IN ('remote', 'hybrid', 'onsite')),
  description TEXT,
  requirements TEXT[],
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  match_score REAL NOT NULL DEFAULT 0,
  priority_score REAL NOT NULL DEFAULT 0,
  score_breakdown JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'reviewing', 'applied', 'interview',
    'offer', 'rejected', 'ghosted', 'saved', 'archived'
  )),
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_match_score ON jobs(match_score DESC);
CREATE INDEX idx_jobs_priority_score ON jobs(priority_score DESC);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read jobs"
  ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role can insert jobs"
  ON jobs FOR INSERT TO service_role WITH CHECK (true);

CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE search_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords TEXT[] NOT NULL,
  excluded_keywords TEXT[],
  locations TEXT[],
  remote_only BOOLEAN DEFAULT FALSE,
  min_salary INTEGER,
  max_results_per_run INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Free Tier Services

| Service | Purpose | Free Tier Limit |
|---------|---------|-----------------|
| **Vercel** | Hosting + serverless functions + cron | Hobby plan: 100GB bandwidth, cron jobs (1/day minimum) |
| **Supabase** | PostgreSQL + Auth + RLS | 500MB DB, 50K monthly auth requests, 2GB bandwidth |
| **JSearch API (RapidAPI)** | Job listings aggregator | Free tier: 200 requests/month |
| **Remotive API** | Remote job listings | Free, no key needed |
| **Arbeitnow API** | EU remote job listings | Free, no key needed |
| **Resend** | Transactional email | 100 emails/day free, 3000/month |

### Cron Job Strategy

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/jobs/scrape",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### Security Requirements (MANDATORY)
1. **Authentication**: Supabase Auth with email/password. NO public signup endpoint. Users created ONLY via `supabase.auth.admin.createUser()`.
2. **Middleware**: Next.js middleware MUST check auth on EVERY route except `/login` and `/api/jobs/scrape`. Cron endpoint protected by `CRON_SECRET` header.
3. **Environment variables**: ALL secrets in `.env.local`.
4. **RLS**: Row Level Security enabled on all Supabase tables.
5. **No secrets in code**: NEVER hardcode any key, password, URL, or token. Always reference `process.env.VARIABLE_NAME`.
6. **CSRF protection**: Use Supabase's built-in CSRF on auth endpoints.
7. **Input sanitization**: Sanitize all user inputs before DB writes.

### Environment Variables Template (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Job APIs
RAPIDAPI_KEY=your_rapidapi_key

# Email
RESEND_API_KEY=your_resend_key
NOTIFICATION_EMAIL=nicogarciapaetz@gmail.com

# Cron Security
CRON_SECRET=your_random_secret_string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Design Direction

The UI should feel like a **modern developer tool** — think Linear, Raycast, or Vercel's dashboard. NOT generic Bootstrap. NOT purple-gradient AI slop.

### Design System
- **Theme**: Dark mode primary (with light mode toggle). Deep charcoal backgrounds (#0A0A0B, #141416), crisp white text, one strong accent color (electric blue #3B82F6 or emerald #10B981).
- **Typography**: Use `font-family: 'Geist', 'Geist Mono'` (load via next/font). Geist for headings/body, Geist Mono for scores and data.
- **Layout**: Sidebar navigation on desktop (collapsible), bottom tab bar on mobile.
- **Cards**: Subtle border (border-white/5), slight backdrop blur, rounded-xl corners. Hover states with border color shift.
- **Score visualization**: Color-coded badges — green (85%+), yellow (60–84%), red (<60%). Animated ring/progress for match score.
- **Kanban board**: Drag-and-drop columns. Cards show company, role, score, days since status change. Color-coded by priority.
- **Transitions**: Subtle fade-in on page load, smooth column transitions on Kanban drag, skeleton loaders during fetch.
- **Responsive**: Mobile-first. Kanban becomes horizontal scroll on mobile. Dashboard stats become 2x2 grid.
- **Empty states**: Friendly icons with actionable text.

---

## Implementation Plan (BUILD IN THIS ORDER)

Build incrementally. Each phase MUST be fully working before moving to the next.

### Phase 1 — Project Setup & Auth
1. Initialize Next.js 14 with App Router, TypeScript, Tailwind CSS
2. Install: `@supabase/supabase-js`, `@supabase/ssr`, `resend`, `lucide-react`
3. Configure Tailwind with design system colors and fonts
4. Set up Supabase clients (browser, server, admin)
5. Create `middleware.ts` auth guard
6. Build login page (clean, centered form, no signup link)
7. Build AuthProvider and useAuth hook
8. Create `scripts/create-user.ts` to create accounts via Admin API
9. Test: unauthenticated → /login, authenticated → /dashboard

### Phase 2 — Layout & Navigation
1. Build Sidebar (logo, nav links, user info, logout)
2. Build MobileNav (bottom tab bar)
3. Build PageWrapper (header with page title + breadcrumbs)
4. Root layout with sidebar + content area
5. Reusable UI: Button, Card, Badge, Input, Modal, Skeleton

### Phase 3 — Database & Types
1. Create all Supabase tables via migrations
2. Define all TypeScript types in `src/types/index.ts`
3. DB helper functions for CRUD
4. Seed search_criteria with initial keywords

### Phase 4 — Job Scoring Algorithm
1. Implement `src/lib/scoring.ts` with weighted scoring
2. Parse job descriptions for skills, languages, remote status, seniority
3. Return: `{ total: 0.87, breakdown: { skillMatch: 0.9, language: 1.0, ... } }`
4. Implement `src/lib/priority.ts`

### Phase 5 — Job Scraping & Storage
1. Implement `src/lib/scraper.ts` with adapters for JSearch, Remotive, Arbeitnow
2. Normalize all API responses to common Job interface
3. Deduplicate by external_id
4. Score each job, store in Supabase
5. Build `/api/jobs/scrape` route protected by CRON_SECRET

### Phase 6 — Email Notifications
1. Set up Resend with HTML email template
2. Build `/api/notify` endpoint
3. Send email for jobs with score ≥ 0.85 (batch into one email per run)
4. Mark `notification_sent = true` after sending

### Phase 7 — Dashboard Page
1. Stat cards: Total Jobs, High Matches, Applied, Interviews, Offers
2. Priority Queue — top 10 unapplied jobs by priority score
3. Recent Jobs feed — latest 20 with score badges
4. Match score distribution chart
5. Quick actions: Mark Applied, Dismiss, View Details

### Phase 8 — Jobs List Page
1. Full listings with pagination
2. Filters: status, score range, remote type, source, date range, keyword search
3. JobCard: logo, title, company, location, remote badge, score ring, date, status
4. Job detail page: description, score breakdown, action buttons, notes, activity timeline

### Phase 9 — Kanban Board
1. Columns: New → Reviewing → Applied → Interview → Offer (+ Rejected, Ghosted collapsed)
2. Drag-and-drop via `@dnd-kit/core`
3. Moving cards updates status in Supabase
4. Cards: company, title, score badge, days in column
5. Sort toggle per column

### Phase 10 — Settings Page
1. Search criteria editor: keywords, excluded keywords, locations, remote toggle, salary range
2. Notification preferences: email on/off, score threshold slider
3. Read-only display of scoring weights
4. "Trigger Scrape Now" button
5. Scrape history log

### Phase 11 — Vercel Deployment & Cron
1. Add `vercel.json` with cron config
2. Set all env vars in Vercel dashboard
3. Deploy and verify cron + email in production
4. Full end-to-end test

After each phase, output:
```
✅ Phase [N] complete — [what was built]
📁 Files created/modified: [list]
🧪 How to test: [specific instructions]
⭐ Ready for Phase [N+1]: [what's next]
```

---

## Constraints (MUST follow)

- NEVER install paid packages or services. EVERYTHING free tier.
- NEVER hardcode secrets, API keys, emails, or URLs in source code. Always use environment variables.
- NEVER create a public signup/registration endpoint. Auth is invite-only.
- NEVER skip TypeScript types. Every function, prop, and API response MUST be typed.
- NEVER write all code in page files. Extract into reusable components.
- NEVER use `any` type. Use `unknown` with type guards if the type is genuinely dynamic.
- NEVER commit `.env.local` or any file containing secrets.
- ALWAYS use Server Components by default. Add `'use client'` ONLY when the component needs browser APIs, hooks, or event handlers.
- ALWAYS handle loading states (skeletons), error states, and empty states.
- ALWAYS use parameterized queries / Supabase client methods — NEVER concatenate SQL strings.
- ALWAYS validate the CRON_SECRET header on the scrape endpoint.
- Keep API calls within free tier limits. Add safeguards to stop if approaching limits.
- Mobile-first responsive design. Test every page at 375px, 768px, and 1440px widths.

---

## Stop Conditions

Pause and ask for human review when:
- A new external service or API needs to be integrated beyond what's listed
- The free tier limit of any service would be exceeded
- A file would be permanently deleted or an architectural decision would be changed
- Two valid implementation paths exist and the choice affects overall architecture
- An error cannot be resolved in 2 attempts
- The task requires installing a package not mentioned here
- You need to write actual API keys or secrets as placeholder values
