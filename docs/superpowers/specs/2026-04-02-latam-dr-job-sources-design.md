# Design: LATAM & Dominican Republic Job Sources

**Date:** 2026-04-02
**Status:** Approved

---

## Problem

The Phase 5 scraper covers remote-global, remote-EU, and remote-US jobs well (JSearch, Remotive, Arbeitnow). It does not surface:
- On-site jobs physically located in the Dominican Republic
- Remote jobs posted by Latin American companies

Nicolás is open to on-site work in Santo Domingo, DR and to remote roles from LATAM employers — both are currently invisible to the scraper.

---

## Coverage Map (After This Change)

| Job type | Sources |
|----------|---------|
| Remote — global / EU / US | JSearch (remote), Remotive, Arbeitnow — **unchanged** |
| On-site — Dominican Republic | JSearch with DR location filter — **extended** |
| Remote — Latin America | Torre.ai, Get on Board — **new** |

---

## New Sources

### Torre.ai
- **Endpoint:** `POST https://torre.ai/api/search/jobs`
- **Auth:** None
- **Coverage:** LATAM-focused job platform. Covers DR, Colombia, Mexico, Argentina, etc. Both remote and on-site.
- **Query strategy:** 2 calls — one for remote LATAM (`remote: true`), one for DR on-site (`location: "Dominican Republic"`)
- **external_id prefix:** `torre_`

### Get on Board
- **Endpoint:** `GET https://www.getonbrd.com/api/v0/jobs`
- **Auth:** None
- **Coverage:** Chilean board with broad LATAM remote tech focus. Filters client-side by keywords.
- **Query strategy:** 1 call, client-side keyword filter
- **external_id prefix:** `getonboard_`

### JSearch — DR location query (extension of existing)
- **Endpoint:** Same as existing (`jsearch.p.rapidapi.com/search`)
- **Change:** `fetchFromJSearch` gains an optional `location?: string` parameter. When provided, `remote_jobs_only` is forced to `false` and `location` is appended to the query params.
- **Query strategy:** 1 call — `query: "software developer"`, `location: "Dominican Republic"`, `remote_jobs_only: false`
- **external_id prefix:** `jsearch_` (unchanged)

---

## JSearch Quota Impact

| Call | Per day | Per month |
|------|---------|-----------|
| Remote (existing, 3 keywords) | 3 | ~90 |
| DR on-site (new, 1 query) | 1 | ~30 |
| **Total** | **4** | **~120** |

Free tier limit: 200/month. Headroom: ~80 requests.

---

## Changes to `src/lib/scraper.ts`

### 1. Extend `fetchFromJSearch` signature

```typescript
// Before
export async function fetchFromJSearch(
  keywords: string[],
  remoteOnly: boolean
): Promise<RawJob[]>

// After
export async function fetchFromJSearch(
  keywords: string[],
  remoteOnly: boolean,
  location?: string   // optional — forces remoteOnly=false when set
): Promise<RawJob[]>
```

When `location` is provided:
- Ignore the `remoteOnly` flag (force `false`)
- Add `location=<value>` to query params
- Cap at 1 keyword (the first from the array, or a default `"software developer"`)

### 2. Add `fetchFromTorre`

```typescript
export async function fetchFromTorre(
  keywords: string[],
  options: { remote: boolean; location?: string }
): Promise<RawJob[]>
```

Called twice in `scrapeAllSources`:
- `{ remote: true }` — remote LATAM jobs
- `{ remote: false, location: 'Dominican Republic' }` — DR on-site

Torre.ai request body:
```json
{
  "query": "<keyword>",
  "offset": 0,
  "size": 20,
  "filters": {
    "remote": true | false,
    "locationName": ["Dominican Republic"]  // only for DR call
  }
}
```

Response shape (with type guard):
```typescript
interface TorreSearchResponse {
  results: Array<{
    opportunity: {
      id: string;
      objective: string;          // job title
      organizations: Array<{ name: string; picture?: string }>;
      locations: Array<{ name: string }>;
      remote: boolean;
      timeZone?: string;
      compensation?: { minAmount?: number; maxAmount?: number; currency?: string };
      deadline?: string;
    };
  }>;
}
```

### 3. Add `fetchFromGetOnBoard`

```typescript
export async function fetchFromGetOnBoard(
  keywords: string[],
  limit: number
): Promise<RawJob[]>
```

Get on Board request:
```
GET https://www.getonbrd.com/api/v0/jobs?per_page=<limit>
```

Response items (with type guard):
```typescript
interface GetOnBoardJob {
  id: string | number;
  title: string;
  company: { name: string; logo_url?: string };
  description: string;       // HTML
  remote_position: boolean;
  country: string;
  published_at: string;      // ISO 8601
  url: string;
}
```

- `remote_type`: `remote_position ? 'remote' : 'onsite'`
- Strip HTML from `description`
- Filter client-side: any keyword in `title + description_snippet`
- `external_id`: `getonboard_<job.id>`

### 4. Update `scrapeAllSources`

`Promise.allSettled` expands from 3 calls to 6:

```typescript
Promise.allSettled([
  fetchFromJSearch(keywords, remote_only),                          // existing remote
  fetchFromJSearch(['software developer'], false, 'Dominican Republic'), // new DR
  fetchFromTorre(keywords, { remote: true }),                       // LATAM remote
  fetchFromTorre(keywords, { remote: false, location: 'Dominican Republic' }), // DR on-site
  fetchFromRemotive(keywords, max_results_per_run),                 // unchanged
  fetchFromArbeitnow(keywords),                                     // unchanged  — note: GetOnBoard handled separately below
])
```

Wait — `fetchFromGetOnBoard` is also included:

```typescript
Promise.allSettled([
  fetchFromJSearch(keywords, remote_only),
  fetchFromJSearch(['software developer'], false, 'Dominican Republic'),
  fetchFromTorre(keywords, { remote: true }),
  fetchFromTorre(keywords, { remote: false, location: 'Dominican Republic' }),
  fetchFromGetOnBoard(keywords, max_results_per_run),
  fetchFromRemotive(keywords, max_results_per_run),
  fetchFromArbeitnow(keywords),
])
```

The `sourceResults` array in the return value adds entries for `'torre'`, `'getonboard'`, and the DR JSearch call. The `JobSource` type in `src/types/index.ts` must be extended.

---

## Changes to `src/types/index.ts`

```typescript
// Before
export type JobSource = 'jsearch' | 'remotive' | 'arbeitnow' | 'manual';

// After
export type JobSource = 'jsearch' | 'remotive' | 'arbeitnow' | 'torre' | 'getonboard' | 'manual';
```

---

## No Other File Changes

The API route (`/api/jobs/scrape/route.ts`), DB layer, scoring, and types (except `JobSource`) are untouched.

---

## Verification

1. **Offline test** — add mock Torre.ai and Get on Board fixtures to `scripts/test-scraper.ts`, confirm scoring works
2. **Live test** (no quota cost for Torre/GetOnBoard):
   ```bash
   npm run test:scraper -- --live
   ```
   Confirm Torre.ai and Get on Board return > 0 LATAM results
3. **DR query test** — confirm JSearch DR call returns on-site Santo Domingo / DR results (uses 1 JSearch credit)
4. **Dedup test** — a job appearing on both Torre and JSearch should appear once in the final list
