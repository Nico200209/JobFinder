// ============================================================
// POST /api/jobs/scrape
// Cron-triggered endpoint: scrape → score → store.
// Protected by Authorization: Bearer <CRON_SECRET>.
// Email notifications are handled in Phase 6.
// ============================================================

import { scrapeAllSources } from '@/lib/scraper';
import { scoreAndRankJob } from '@/lib/priority';
import { upsertJob } from '@/lib/db/jobs';
import { getSearchCriteria } from '@/lib/db/criteria';
import type { NewJob, ScrapeRunSummary, SearchCriteria } from '@/types';

const DEFAULT_CRITERIA: SearchCriteria = {
  id: 'default',
  keywords: ['react developer', 'frontend developer', 'game designer'],
  excluded_keywords: null,
  locations: null,
  remote_only: true,
  min_salary: null,
  max_results_per_run: 50,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function POST(request: Request): Promise<Response> {
  // --- Auth check ---
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  const errors: string[] = [];

  // --- Load search criteria ---
  let criteria: SearchCriteria;
  try {
    criteria = (await getSearchCriteria()) ?? DEFAULT_CRITERIA;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed to load search criteria: ${msg}`);
    criteria = DEFAULT_CRITERIA;
  }

  // --- Scrape all sources ---
  let rawJobs;
  let sourceResults;
  try {
    const result = await scrapeAllSources(criteria);
    rawJobs = result.jobs;
    sourceResults = result.sourceResults;

    // Collect per-source errors into the run summary
    for (const sr of sourceResults) {
      if (sr.error) {
        errors.push(`[${sr.source}] ${sr.error}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const summary: ScrapeRunSummary = {
      ran_at: now.toISOString(),
      sources: [],
      total_fetched: 0,
      total_upserted: 0,
      duration_ms: Date.now() - startedAt,
      errors: [`scrapeAllSources failed: ${msg}`],
    };
    return Response.json(summary, { status: 500 });
  }

  // --- Score and upsert each job ---
  let upsertedCount = 0;
  for (const raw of rawJobs) {
    try {
      const scores = scoreAndRankJob(raw, now);
      const newJob: NewJob = {
        ...raw,
        // Normalize optional fields to null for DB compatibility
        company_logo_url: raw.company_logo_url ?? null,
        location: raw.location ?? null,
        remote_type: raw.remote_type ?? null,
        description: raw.description ?? null,
        requirements: raw.requirements ?? null,
        salary_min: raw.salary_min ?? null,
        salary_max: raw.salary_max ?? null,
        salary_currency: raw.salary_currency ?? 'USD',
        posted_at: raw.posted_at ?? null,
        expires_at: raw.expires_at ?? null,
        // Scoring fields
        match_score: scores.match_score,
        priority_score: scores.priority_score,
        score_breakdown: scores.score_breakdown,
        // Status fields
        status: 'new',
        status_updated_at: now.toISOString(),
        notes: null,
        notification_sent: false,
      };
      await upsertJob(newJob);
      upsertedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`upsert failed for ${raw.external_id}: ${msg}`);
    }
  }

  const summary: ScrapeRunSummary = {
    ran_at: now.toISOString(),
    sources: sourceResults,
    total_fetched: rawJobs.length,
    total_upserted: upsertedCount,
    duration_ms: Date.now() - startedAt,
    errors,
  };

  return Response.json(summary, { status: 200 });
}
