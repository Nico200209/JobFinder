import type { RawJob, ScoringResult } from '@/types';
import {
  KNOWN_COMPANIES,
  PRIORITY_WEIGHTS,
  FRESHNESS_MAX_AGE_DAYS,
  DEADLINE_URGENCY_DAYS,
} from './user-profile';
import { scoreJob } from './scoring';

// ─── Factor scorers ───────────────────────────────────────────────────────────

function freshnessFactor(posted_at: string | null | undefined, now: Date): number {
  if (!posted_at) return 0.5; // unknown posting date — neutral
  const ageMs   = now.getTime() - new Date(posted_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 0) return 1.0; // scheduled future posts
  return Math.max(0, 1 - ageDays / FRESHNESS_MAX_AGE_DAYS);
}

function deadlineFactor(expires_at: string | null | undefined, now: Date): number {
  if (!expires_at) return 0.5; // no deadline — neutral

  const daysLeft = (new Date(expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 0)                     return 0.0; // expired
  if (daysLeft <= DEADLINE_URGENCY_DAYS) return 1.0; // urgent
  if (daysLeft >= 30)                    return 0.1; // plenty of time
  // linear interpolation between urgency threshold and 30 days
  return 0.1 + (0.9 * (30 - daysLeft)) / (30 - DEADLINE_URGENCY_DAYS);
}

function companyTierFactor(company: string): number {
  const name = company.toLowerCase();
  return [...KNOWN_COMPANIES].some((known) => name.includes(known)) ? 1.0 : 0.3;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computePriorityScore(
  scoring: ScoringResult,
  raw: Pick<RawJob, 'posted_at' | 'expires_at' | 'company'>,
  now: Date = new Date()
): number {
  // Zero match (e.g. Dutch-required) → zero priority
  if (scoring.match_score === 0) return 0;

  // Expired jobs get 0 immediately
  if (raw.expires_at) {
    const daysLeft = (new Date(raw.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) return 0;
  }

  const priority =
    scoring.match_score                    * PRIORITY_WEIGHTS.matchScore +
    freshnessFactor(raw.posted_at, now)    * PRIORITY_WEIGHTS.freshness +
    deadlineFactor(raw.expires_at, now)    * PRIORITY_WEIGHTS.deadline +
    companyTierFactor(raw.company)         * PRIORITY_WEIGHTS.companyTier;

  return Math.round(priority * 1000) / 1000;
}

/** Single entry point for Phase 5 scraper — returns fully populated ScoringResult. */
export function scoreAndRankJob(raw: RawJob, now: Date = new Date()): ScoringResult {
  const scoring = scoreJob(raw);
  const priority_score = computePriorityScore(scoring, raw, now);
  return { ...scoring, priority_score };
}

/** Batch scoring + sorting by priority_score descending. */
export function rankJobs(raws: RawJob[], now: Date = new Date()): Array<RawJob & ScoringResult> {
  return raws
    .map((raw) => ({ ...raw, ...scoreAndRankJob(raw, now) }))
    .sort((a, b) => b.priority_score - a.priority_score);
}
