# LATAM & Dominican Republic Job Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Torre.ai (LATAM remote + DR on-site), Get on Board (LATAM remote), and a JSearch DR location query to the existing scraper so the daily cron surfaces on-site Dominican Republic jobs and remote Latin American jobs alongside the existing global remote coverage.

**Architecture:** Three changes to `src/lib/scraper.ts` — extend `fetchFromJSearch` with an optional `location` param, add `fetchFromTorre` and `fetchFromGetOnBoard` adapters, and update `scrapeAllSources` to call all 7 sources in parallel via `Promise.allSettled`. The `JobSource` union type gets two new values. No other files change.

**Tech Stack:** TypeScript, Next.js 14, Vitest (tests), native `fetch`, `@/types` path alias

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'torre' \| 'getonboard'` to `JobSource` union |
| `src/lib/scraper.ts` | Extend `fetchFromJSearch`, add `fetchFromTorre`, add `fetchFromGetOnBoard`, update `scrapeAllSources` |
| `src/lib/__tests__/scraper.test.ts` | New — unit tests for all three changes |
| `scripts/test-scraper.ts` | Add Torre.ai and Get on Board mock fixtures |

---

## Task 1: Extend JobSource type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update the union type**

In `src/types/index.ts`, change line 22:

```typescript
// Before
export type JobSource = 'jsearch' | 'remotive' | 'arbeitnow' | 'manual';

// After
export type JobSource = 'jsearch' | 'remotive' | 'arbeitnow' | 'torre' | 'getonboard' | 'manual';
```

- [ ] **Step 2: Verify TypeScript is still clean**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add torre and getonboard to JobSource type"
```

---

## Task 2: Torre.ai adapter (TDD)

**Files:**
- Create: `src/lib/__tests__/scraper.test.ts`
- Modify: `src/lib/scraper.ts`

Torre.ai API: `POST https://torre.ai/api/search/jobs`
No auth required. Request body:
```json
{ "query": "react developer", "offset": 0, "size": 20, "filters": { "remote": true } }
```
For DR on-site, add `"locationName": ["Dominican Republic"]` to filters and set `"remote": false`.

Response shape:
```json
{
  "results": [
    {
      "opportunity": {
        "id": "abc123",
        "objective": "Frontend Developer",
        "organizations": [{ "name": "Acme LATAM", "picture": "https://logo.png" }],
        "locations": [{ "name": "Colombia" }],
        "remote": true,
        "compensation": { "minAmount": 40000, "maxAmount": 60000, "currency": "USD" },
        "deadline": null
      }
    }
  ]
}
```

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/scraper.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFromTorre } from '../scraper';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => body,
    })
  );
}

describe('fetchFromTorre', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes a remote LATAM result to RawJob', async () => {
    mockFetch({
      results: [
        {
          opportunity: {
            id: 'abc123',
            objective: 'Frontend Developer',
            organizations: [{ name: 'Acme LATAM', picture: 'https://logo.png' }],
            locations: [{ name: 'Colombia' }],
            remote: true,
            compensation: { minAmount: 40000, maxAmount: 60000, currency: 'USD' },
            deadline: null,
          },
        },
      ],
    });

    const jobs = await fetchFromTorre(['frontend'], { remote: true });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('torre_abc123');
    expect(jobs[0].title).toBe('Frontend Developer');
    expect(jobs[0].company).toBe('Acme LATAM');
    expect(jobs[0].company_logo_url).toBe('https://logo.png');
    expect(jobs[0].remote_type).toBe('remote');
    expect(jobs[0].source).toBe('torre');
    expect(jobs[0].salary_min).toBe(40000);
    expect(jobs[0].salary_max).toBe(60000);
    expect(jobs[0].salary_currency).toBe('USD');
  });

  it('sets remote_type to onsite when remote=false', async () => {
    mockFetch({
      results: [
        {
          opportunity: {
            id: 'xyz',
            objective: 'Game Designer',
            organizations: [{ name: 'DR Studio' }],
            locations: [{ name: 'Santo Domingo' }],
            remote: false,
            compensation: null,
            deadline: null,
          },
        },
      ],
    });

    const jobs = await fetchFromTorre(['game designer'], {
      remote: false,
      location: 'Dominican Republic',
    });

    expect(jobs[0].remote_type).toBe('onsite');
    expect(jobs[0].location).toBe('Santo Domingo');
  });

  it('returns empty array when results is empty', async () => {
    mockFetch({ results: [] });
    const jobs = await fetchFromTorre(['react'], { remote: true });
    expect(jobs).toEqual([]);
  });

  it('throws on unexpected response shape', async () => {
    mockFetch({ unexpected: true });
    await expect(fetchFromTorre(['react'], { remote: true })).rejects.toThrow(
      'Torre.ai returned unexpected response shape'
    );
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetch({}, false, 429);
    await expect(fetchFromTorre(['react'], { remote: true })).rejects.toThrow(
      'Torre.ai request failed: 429'
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- scraper
```

Expected: FAIL with `fetchFromTorre is not a function` (or similar import error).

- [ ] **Step 3: Add Torre.ai interfaces and adapter to `src/lib/scraper.ts`**

Append after the Arbeitnow section (before `// Main Entry Point`):

```typescript
// ------------------------------------------------------------
// Torre.ai Adapter
// ------------------------------------------------------------

interface TorreOrganization {
  name: string;
  picture?: string;
}

interface TorreLocation {
  name: string;
}

interface TorreOpportunity {
  id: string;
  objective: string;
  organizations: TorreOrganization[];
  locations: TorreLocation[];
  remote: boolean;
  compensation: {
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
  } | null;
  deadline: string | null;
}

interface TorreResult {
  opportunity: TorreOpportunity;
}

function isTorreResponse(data: unknown): data is { results: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    Array.isArray((data as Record<string, unknown>).results)
  );
}

function isTorreResult(item: unknown): item is TorreResult {
  if (typeof item !== 'object' || item === null) return false;
  const r = item as Record<string, unknown>;
  if (typeof r.opportunity !== 'object' || r.opportunity === null) return false;
  const opp = r.opportunity as Record<string, unknown>;
  return (
    typeof opp.id === 'string' &&
    typeof opp.objective === 'string' &&
    Array.isArray(opp.organizations)
  );
}

function normalizeTorreJob(
  opp: TorreOpportunity
): RawJob {
  const company = opp.organizations[0]?.name ?? 'Unknown';
  const logo = opp.organizations[0]?.picture;
  const location = opp.locations[0]?.name;
  const comp = opp.compensation;

  return {
    external_id: `torre_${opp.id}`,
    title: opp.objective,
    company,
    company_logo_url: logo || undefined,
    location: location || undefined,
    remote_type: opp.remote ? 'remote' : 'onsite',
    salary_min: comp?.minAmount ?? undefined,
    salary_max: comp?.maxAmount ?? undefined,
    salary_currency: comp?.currency ?? undefined,
    url: `https://torre.ai/jobs/${opp.id}`,
    source: 'torre' as JobSource,
    expires_at: opp.deadline ?? undefined,
  };
}

/**
 * Fetch jobs from Torre.ai.
 * Called twice by scrapeAllSources: once for remote LATAM, once for DR on-site.
 */
export async function fetchFromTorre(
  keywords: string[],
  options: { remote: boolean; location?: string }
): Promise<RawJob[]> {
  const jobs: RawJob[] = [];

  for (const keyword of keywords.slice(0, 3)) {
    const filters: Record<string, unknown> = { remote: options.remote };
    if (options.location) {
      filters.locationName = [options.location];
    }

    const response = await fetch('https://torre.ai/api/search/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: keyword, offset: 0, size: 20, filters }),
    });

    if (!response.ok) {
      throw new Error(
        `Torre.ai request failed: ${response.status} ${response.statusText}`
      );
    }

    const json: unknown = await response.json();
    if (!isTorreResponse(json)) {
      throw new Error('Torre.ai returned unexpected response shape');
    }

    for (const item of json.results) {
      if (isTorreResult(item)) {
        jobs.push(normalizeTorreJob(item.opportunity));
      }
    }
  }

  return jobs;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- scraper
```

Expected: all `fetchFromTorre` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper.ts src/lib/__tests__/scraper.test.ts
git commit -m "feat: add Torre.ai adapter for LATAM and DR jobs"
```

---

## Task 3: Get on Board adapter (TDD)

**Files:**
- Modify: `src/lib/__tests__/scraper.test.ts`
- Modify: `src/lib/scraper.ts`

Get on Board API: `GET https://www.getonbrd.com/api/v0/jobs?per_page=<limit>`
No auth required. Returns an array directly (not wrapped):
```json
[
  {
    "id": 42,
    "title": "React Developer",
    "company": { "name": "StartupCL", "logo_url": null },
    "description": "<p>React and TypeScript required</p>",
    "remote_position": true,
    "country": "Chile",
    "published_at": "2026-04-01T00:00:00Z",
    "url": "https://www.getonbrd.com/jobs/programming/react-developer-startupCL"
  }
]
```

- [ ] **Step 1: Append tests to `src/lib/__tests__/scraper.test.ts`**

Add after the existing `fetchFromTorre` describe block:

```typescript
import { fetchFromTorre, fetchFromGetOnBoard } from '../scraper';

// (update the import line at the top to include fetchFromGetOnBoard)
```

Replace the import at the top of the file:
```typescript
import { fetchFromTorre, fetchFromGetOnBoard } from '../scraper';
```

Then append:
```typescript
describe('fetchFromGetOnBoard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('filters jobs by keyword and normalizes to RawJob', async () => {
    mockFetch([
      {
        id: 42,
        title: 'React Developer',
        company: { name: 'StartupCL', logo_url: null },
        description: '<p>We need React and TypeScript skills</p>',
        remote_position: true,
        country: 'Chile',
        published_at: '2026-04-01T00:00:00Z',
        url: 'https://www.getonbrd.com/jobs/42',
      },
      {
        id: 43,
        title: 'Java Backend Engineer',
        company: { name: 'OtherCo', logo_url: null },
        description: '<p>Java Spring Boot experience required</p>',
        remote_position: true,
        country: 'Colombia',
        published_at: '2026-04-01T00:00:00Z',
        url: 'https://www.getonbrd.com/jobs/43',
      },
    ]);

    const jobs = await fetchFromGetOnBoard(['react'], 50);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('getonboard_42');
    expect(jobs[0].title).toBe('React Developer');
    expect(jobs[0].company).toBe('StartupCL');
    expect(jobs[0].remote_type).toBe('remote');
    expect(jobs[0].source).toBe('getonboard');
    expect(jobs[0].description).not.toContain('<p>');
    expect(jobs[0].posted_at).toBe('2026-04-01T00:00:00Z');
  });

  it('returns empty array when no jobs match keywords', async () => {
    mockFetch([
      {
        id: 99,
        title: 'Java Backend Engineer',
        company: { name: 'OtherCo', logo_url: null },
        description: '<p>Java only</p>',
        remote_position: true,
        country: 'Colombia',
        published_at: '2026-04-01T00:00:00Z',
        url: 'https://www.getonbrd.com/jobs/99',
      },
    ]);

    const jobs = await fetchFromGetOnBoard(['react', 'typescript'], 50);
    expect(jobs).toEqual([]);
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetch({}, false, 503);
    await expect(fetchFromGetOnBoard(['react'], 50)).rejects.toThrow(
      'Get on Board request failed: 503'
    );
  });

  it('throws on unexpected response shape', async () => {
    mockFetch({ jobs: [] }); // object instead of array
    await expect(fetchFromGetOnBoard(['react'], 50)).rejects.toThrow(
      'Get on Board returned unexpected response shape'
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- scraper
```

Expected: FAIL with `fetchFromGetOnBoard is not a function`.

- [ ] **Step 3: Add Get on Board interfaces and adapter to `src/lib/scraper.ts`**

Append after the Torre.ai section (before `// Main Entry Point`):

```typescript
// ------------------------------------------------------------
// Get on Board Adapter
// ------------------------------------------------------------

interface GetOnBoardJob {
  id: number | string;
  title: string;
  company: { name: string; logo_url?: string | null };
  description: string;
  remote_position: boolean;
  country: string;
  published_at: string;
  url: string;
}

function isGetOnBoardResponse(data: unknown): data is unknown[] {
  return Array.isArray(data);
}

function isGetOnBoardJob(item: unknown): item is GetOnBoardJob {
  if (typeof item !== 'object' || item === null) return false;
  const j = item as Record<string, unknown>;
  return (
    (typeof j.id === 'number' || typeof j.id === 'string') &&
    typeof j.title === 'string' &&
    typeof j.company === 'object' &&
    j.company !== null &&
    typeof (j.company as Record<string, unknown>).name === 'string' &&
    typeof j.url === 'string'
  );
}

function normalizeGetOnBoardJob(job: GetOnBoardJob): RawJob {
  return {
    external_id: `getonboard_${job.id}`,
    title: job.title,
    company: job.company.name,
    company_logo_url: job.company.logo_url ?? undefined,
    location: job.country || undefined,
    remote_type: job.remote_position ? 'remote' : 'onsite',
    description: stripHtml(job.description),
    url: job.url,
    source: 'getonboard' as JobSource,
    posted_at: job.published_at,
  };
}

/**
 * Fetch LATAM remote tech jobs from Get on Board, filtered client-side by keywords.
 */
export async function fetchFromGetOnBoard(
  keywords: string[],
  limit: number
): Promise<RawJob[]> {
  const params = new URLSearchParams({ per_page: String(limit) });

  const response = await fetch(
    `https://www.getonbrd.com/api/v0/jobs?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Get on Board request failed: ${response.status} ${response.statusText}`
    );
  }

  const json: unknown = await response.json();
  if (!isGetOnBoardResponse(json)) {
    throw new Error('Get on Board returned unexpected response shape');
  }

  const matching: RawJob[] = [];
  for (const item of json) {
    if (!isGetOnBoardJob(item)) continue;
    const descSnippet = stripHtml(item.description).slice(0, 500);
    const searchText = `${item.title} ${descSnippet}`;
    if (jobMatchesKeywords(searchText, keywords)) {
      matching.push(normalizeGetOnBoardJob(item));
    }
  }

  return matching;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- scraper
```

Expected: all `fetchFromGetOnBoard` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper.ts src/lib/__tests__/scraper.test.ts
git commit -m "feat: add Get on Board adapter for LATAM remote jobs"
```

---

## Task 4: Extend fetchFromJSearch with location parameter (TDD)

**Files:**
- Modify: `src/lib/__tests__/scraper.test.ts`
- Modify: `src/lib/scraper.ts`

When `location` is provided, `remote_jobs_only` must be forced to `false` (DR on-site jobs aren't remote) and `location` is added to the query params. Cap at 1 keyword for location queries to conserve quota.

- [ ] **Step 1: Append tests to `src/lib/__tests__/scraper.test.ts`**

Update import at top:
```typescript
import { fetchFromTorre, fetchFromGetOnBoard, fetchFromJSearch } from '../scraper';
```

Append:
```typescript
describe('fetchFromJSearch — location parameter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAPIDAPI_KEY;
  });

  it('includes location param and omits remote_jobs_only when location is set', async () => {
    const capturedUrls: string[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        capturedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      })
    );

    process.env.RAPIDAPI_KEY = 'test-key';
    await fetchFromJSearch(['software developer'], true, 'Dominican Republic');

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toContain('location=Dominican+Republic');
    expect(capturedUrls[0]).not.toContain('remote_jobs_only');
  });

  it('caps at 1 keyword when location is set', async () => {
    const capturedUrls: string[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        capturedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      })
    );

    process.env.RAPIDAPI_KEY = 'test-key';
    await fetchFromJSearch(
      ['react developer', 'game designer', 'frontend'],
      false,
      'Dominican Republic'
    );

    // Only 1 request regardless of how many keywords
    expect(capturedUrls).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- scraper
```

Expected: FAIL — `location` param does not appear in the URL yet.

- [ ] **Step 3: Extend `fetchFromJSearch` in `src/lib/scraper.ts`**

Find the existing `fetchFromJSearch` export and replace it:

```typescript
/**
 * Fetch jobs from JSearch (RapidAPI).
 * - Remote mode: queries first 3 keywords with remote_jobs_only=true (~90 req/month)
 * - Location mode: queries first keyword only with a location filter (~30 req/month)
 */
export async function fetchFromJSearch(
  keywords: string[],
  remoteOnly: boolean,
  location?: string
): Promise<RawJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error('RAPIDAPI_KEY is not set');

  // Location queries cap at 1 keyword to conserve quota
  const queryKeywords = location ? keywords.slice(0, 1) : keywords.slice(0, 3);
  const jobs: RawJob[] = [];

  for (const keyword of queryKeywords) {
    const params = new URLSearchParams({ query: keyword, num_pages: '1' });

    if (location) {
      params.set('location', location);
      // remote_jobs_only must be omitted for on-site location queries
    } else if (remoteOnly) {
      params.set('remote_jobs_only', 'true');
    }

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `JSearch request failed for keyword "${keyword}": ${response.status} ${response.statusText}`
      );
    }

    const json: unknown = await response.json();
    if (!isJSearchResponse(json)) {
      throw new Error(
        `JSearch returned unexpected response shape for keyword "${keyword}"`
      );
    }

    for (const item of json.data) {
      if (isJSearchJob(item)) {
        jobs.push(normalizeJSearchJob(item));
      }
    }
  }

  return jobs;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- scraper
```

Expected: all `fetchFromJSearch — location parameter` tests PASS, plus all previous tests still PASS.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scraper.ts src/lib/__tests__/scraper.test.ts
git commit -m "feat: extend fetchFromJSearch with optional location param for DR queries"
```

---

## Task 5: Update scrapeAllSources to call all 7 sources

**Files:**
- Modify: `src/lib/scraper.ts`

`scrapeAllSources` expands from 3 to 7 parallel calls. The two Torre.ai calls use keywords directly. The JSearch DR call uses the first keyword (or falls back to `'software developer'`).

- [ ] **Step 1: Replace `scrapeAllSources` in `src/lib/scraper.ts`**

Find the existing `scrapeAllSources` export and replace the entire function:

```typescript
/**
 * Scrape all sources in parallel. Returns deduplicated RawJob list
 * plus per-source stats. One failing source never blocks the others.
 *
 * Sources:
 *  1. JSearch remote       — global remote jobs
 *  2. JSearch DR           — on-site Dominican Republic jobs
 *  3. Torre.ai remote      — remote LATAM jobs
 *  4. Torre.ai DR          — on-site Dominican Republic jobs via Torre
 *  5. Get on Board         — remote LATAM tech jobs
 *  6. Remotive             — remote global tech jobs
 *  7. Arbeitnow            — remote EU jobs
 */
export async function scrapeAllSources(criteria: SearchCriteria): Promise<{
  jobs: RawJob[];
  sourceResults: SourceResult[];
}> {
  const { keywords, remote_only, max_results_per_run } = criteria;
  const drKeyword = keywords[0] ?? 'software developer';

  const [
    jSearchRemoteResult,
    jSearchDrResult,
    torreRemoteResult,
    torreDrResult,
    getOnBoardResult,
    remotiveResult,
    arbeitnowResult,
  ] = await Promise.allSettled([
    fetchFromJSearch(keywords, remote_only),
    fetchFromJSearch([drKeyword], false, 'Dominican Republic'),
    fetchFromTorre(keywords, { remote: true }),
    fetchFromTorre(keywords, { remote: false, location: 'Dominican Republic' }),
    fetchFromGetOnBoard(keywords, max_results_per_run),
    fetchFromRemotive(keywords, max_results_per_run),
    fetchFromArbeitnow(keywords),
  ]);

  const settled: Array<{
    source: JobSource;
    result: PromiseSettledResult<RawJob[]>;
  }> = [
    { source: 'jsearch', result: jSearchRemoteResult },
    { source: 'jsearch', result: jSearchDrResult },
    { source: 'torre', result: torreRemoteResult },
    { source: 'torre', result: torreDrResult },
    { source: 'getonboard', result: getOnBoardResult },
    { source: 'remotive', result: remotiveResult },
    { source: 'arbeitnow', result: arbeitnowResult },
  ];

  const sourceResults: SourceResult[] = [];
  const allJobs: RawJob[] = [];

  for (const { source, result } of settled) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
      sourceResults.push({ source, fetched: result.value.length, error: null });
    } else {
      const errorMessage =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      sourceResults.push({ source, fetched: 0, error: errorMessage });
    }
  }

  const jobs = deduplicateByExternalId(allJobs);
  return { jobs, sourceResults };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scraper.ts
git commit -m "feat: expand scrapeAllSources to 7 sources including LATAM and DR"
```

---

## Task 6: Update offline test script with new mock fixtures

**Files:**
- Modify: `scripts/test-scraper.ts`

Add Torre.ai and Get on Board mock jobs to `MOCK_JOBS` so the offline test (`npm run test:scraper`) exercises the new normalizers without network calls.

- [ ] **Step 1: Add mock fixtures to `scripts/test-scraper.ts`**

Find the `MOCK_JOBS` array and add these two entries:

```typescript
  {
    external_id: 'torre_latam001',
    title: 'Frontend Developer (React)',
    company: 'Startup Colombia',
    location: 'Colombia',
    remote_type: 'remote' as const,
    description:
      'Remote LATAM role for a React and TypeScript developer. English required. ' +
      'You will work with Figma designs and build components for our Next.js app. ' +
      'Mentorship program included.',
    salary_min: 35000,
    salary_max: 55000,
    salary_currency: 'USD',
    url: 'https://torre.ai/jobs/torre_latam001',
    source: 'torre' as const,
    posted_at: new Date().toISOString(),
  },
  {
    external_id: 'getonboard_dr001',
    title: 'Game Designer (On-site, Santo Domingo)',
    company: 'DR Games Studio',
    location: 'Dominican Republic',
    remote_type: 'onsite' as const,
    description:
      'Looking for a game designer with Unity and C# experience to join our team in Santo Domingo. ' +
      'You will create GDD documentation, design systems, and prototype mechanics. English-speaking team.',
    url: 'https://getonbrd.com/jobs/dr001',
    source: 'getonboard' as const,
    posted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
```

- [ ] **Step 2: Run offline test**

```bash
npm run test:scraper
```

Expected output includes all 5 mock jobs scored. The Torre LATAM job should score ~75%+ (remote React role with mentorship). The DR game designer should score 70%+ (on-site DR + Unity/C# skills match).

- [ ] **Step 3: Run full test suite one final time**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-scraper.ts
git commit -m "test: add Torre.ai and Get on Board mock fixtures to offline scraper test"
```

---

## Verification Checklist

- [ ] `npm test` — all tests pass
- [ ] `npm run test:scraper` — 5 mock jobs scored, no errors
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] Live test (optional, no quota cost for Torre/GetOnBoard):
  ```bash
  npm run test:scraper -- --live
  ```
  Confirm Torre.ai and Get on Board each return > 0 LATAM results.
