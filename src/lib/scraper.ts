// ============================================================
// JobRadar — Job Scraper
// Fetches from multiple job APIs and normalizes to RawJob.
// Sources: JSearch, Remotive, Arbeitnow, Torre.ai, Get on Board
// All adapters fail gracefully — one failure never blocks others.
// ============================================================

import type {
  RawJob,
  RemoteType,
  JobSource,
  SourceResult,
  SearchCriteria,
} from '@/types';

// ------------------------------------------------------------
// HTML Utilities
// ------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function detectRemoteType(isRemote: boolean, location?: string): RemoteType {
  if (isRemote) return 'remote';
  if (location && /hybrid/i.test(location)) return 'hybrid';
  return 'onsite';
}

// ------------------------------------------------------------
// JSearch (RapidAPI) Adapter
// ------------------------------------------------------------

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_city: string | null;
  job_country: string | null;
  job_is_remote: boolean;
  job_description: string;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
  };
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_apply_link: string;
  job_posted_at_datetime_utc: string | null;
  job_offer_expiration_datetime_utc: string | null;
}

function isJSearchResponse(data: unknown): data is { data: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    Array.isArray((data as Record<string, unknown>).data)
  );
}

function isJSearchJob(item: unknown): item is JSearchJob {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).job_id === 'string' &&
    typeof (item as Record<string, unknown>).job_title === 'string' &&
    typeof (item as Record<string, unknown>).employer_name === 'string'
  );
}

function normalizeJSearchJob(job: JSearchJob): RawJob {
  const locationParts = [job.job_city, job.job_country].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

  const requirements: string[] = job.job_highlights?.Qualifications ?? [];

  return {
    external_id: `jsearch_${job.job_id}`,
    title: job.job_title,
    company: job.employer_name,
    company_logo_url: job.employer_logo ?? undefined,
    location,
    remote_type: detectRemoteType(job.job_is_remote, location),
    description: job.job_description,
    requirements: requirements.length > 0 ? requirements : undefined,
    salary_min: job.job_min_salary ?? undefined,
    salary_max: job.job_max_salary ?? undefined,
    salary_currency: job.job_salary_currency ?? undefined,
    url: job.job_apply_link,
    source: 'jsearch' as JobSource,
    posted_at: job.job_posted_at_datetime_utc ?? undefined,
    expires_at: job.job_offer_expiration_datetime_utc ?? undefined,
  };
}

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

// ------------------------------------------------------------
// Remotive Adapter
// ------------------------------------------------------------

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

function isRemotiveResponse(data: unknown): data is { jobs: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'jobs' in data &&
    Array.isArray((data as Record<string, unknown>).jobs)
  );
}

function isRemotiveJob(item: unknown): item is RemotiveJob {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).id === 'number' &&
    typeof (item as Record<string, unknown>).title === 'string' &&
    typeof (item as Record<string, unknown>).company_name === 'string' &&
    typeof (item as Record<string, unknown>).url === 'string'
  );
}

function normalizeRemotiveJob(job: RemotiveJob): RawJob {
  return {
    external_id: `remotive_${job.id}`,
    title: job.title,
    company: job.company_name,
    company_logo_url: job.company_logo || undefined,
    location: job.candidate_required_location || undefined,
    remote_type: 'remote',
    description: stripHtml(job.description),
    requirements: job.tags.length > 0 ? job.tags : undefined,
    url: job.url,
    source: 'remotive' as JobSource,
    posted_at: job.publication_date,
  };
}

function jobMatchesKeywords(searchText: string, keywords: string[]): boolean {
  const lower = searchText.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Fetch remote software jobs from Remotive, filtered client-side by keywords.
 */
export async function fetchFromRemotive(
  keywords: string[],
  limit: number
): Promise<RawJob[]> {
  const params = new URLSearchParams({
    category: 'software-dev',
    limit: String(limit),
  });

  const response = await fetch(
    `https://remotive.com/api/remote-jobs?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Remotive request failed: ${response.status} ${response.statusText}`
    );
  }

  const json: unknown = await response.json();
  if (!isRemotiveResponse(json)) {
    throw new Error('Remotive returned unexpected response shape');
  }

  const matching: RawJob[] = [];
  for (const item of json.jobs) {
    if (!isRemotiveJob(item)) continue;
    const searchText = `${item.title} ${item.tags.join(' ')}`;
    if (jobMatchesKeywords(searchText, keywords)) {
      matching.push(normalizeRemotiveJob(item));
    }
  }

  return matching;
}

// ------------------------------------------------------------
// Arbeitnow Adapter
// ------------------------------------------------------------

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  tags: string[];
  job_types: string[];
  url: string;
  created_at: number;
  remote: boolean;
}

function isArbeitnowResponse(data: unknown): data is { data: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    Array.isArray((data as Record<string, unknown>).data)
  );
}

function isArbeitnowJob(item: unknown): item is ArbeitnowJob {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).slug === 'string' &&
    typeof (item as Record<string, unknown>).title === 'string' &&
    typeof (item as Record<string, unknown>).company_name === 'string' &&
    typeof (item as Record<string, unknown>).url === 'string'
  );
}

function normalizeArbeitnowJob(job: ArbeitnowJob): RawJob {
  const descriptionText = stripHtml(job.description);
  // Use first 300 chars of description for keyword matching (full description stored)
  return {
    external_id: `arbeitnow_${job.slug}`,
    title: job.title,
    company: job.company_name,
    location: job.location || undefined,
    remote_type: job.remote ? 'remote' : 'onsite',
    description: descriptionText,
    requirements: job.tags.length > 0 ? job.tags : undefined,
    url: job.url,
    source: 'arbeitnow' as JobSource,
    posted_at: new Date(job.created_at * 1000).toISOString(),
  };
}

/**
 * Fetch EU remote jobs from Arbeitnow, filtered client-side by keywords.
 */
export async function fetchFromArbeitnow(
  keywords: string[],
  limit: number
): Promise<RawJob[]> {
  const response = await fetch(
    'https://www.arbeitnow.com/api/job-board-api'
  );

  if (!response.ok) {
    throw new Error(
      `Arbeitnow request failed: ${response.status} ${response.statusText}`
    );
  }

  const json: unknown = await response.json();
  if (!isArbeitnowResponse(json)) {
    throw new Error('Arbeitnow returned unexpected response shape');
  }

  const matching: RawJob[] = [];
  for (const item of json.data) {
    if (!isArbeitnowJob(item)) continue;
    // Search across title, tags, and first 500 chars of description (HTML-stripped inline)
    const descriptionSnippet = stripHtml(item.description).slice(0, 500);
    const searchText = `${item.title} ${item.tags.join(' ')} ${descriptionSnippet}`;
    if (jobMatchesKeywords(searchText, keywords)) {
      matching.push(normalizeArbeitnowJob(item));
      if (matching.length >= limit) break;
    }
  }

  return matching;
}

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

function normalizeTorreJob(opp: TorreOpportunity): RawJob {
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
    typeof j.description === 'string' &&
    typeof j.remote_position === 'boolean' &&
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

// ------------------------------------------------------------
// Main Entry Point
// ------------------------------------------------------------

function deduplicateByExternalId(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  const unique: RawJob[] = [];
  for (const job of jobs) {
    if (!seen.has(job.external_id)) {
      seen.add(job.external_id);
      unique.push(job);
    }
  }
  return unique;
}

/**
 * Scrape all three sources in parallel. Returns deduplicated RawJob list
 * plus per-source stats. One failing source never blocks the others.
 */
export async function scrapeAllSources(criteria: SearchCriteria): Promise<{
  jobs: RawJob[];
  sourceResults: SourceResult[];
}> {
  const { keywords, remote_only, max_results_per_run } = criteria;

  const [jSearchResult, remotiveResult, arbeitnowResult] =
    await Promise.allSettled([
      fetchFromJSearch(keywords, remote_only),
      fetchFromRemotive(keywords, max_results_per_run),
      fetchFromArbeitnow(keywords, max_results_per_run),
    ]);

  const sourceResults: SourceResult[] = [];
  const allJobs: RawJob[] = [];

  const sources: Array<{
    source: JobSource;
    result: PromiseSettledResult<RawJob[]>;
  }> = [
    { source: 'jsearch', result: jSearchResult },
    { source: 'remotive', result: remotiveResult },
    { source: 'arbeitnow', result: arbeitnowResult },
  ];

  for (const { source, result } of sources) {
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
