import type { RawJob, ScoreBreakdown, ScoringResult } from '@/types';
import {
  USER_SKILLS,
  USER_SKILL_ALIASES,
  KNOWN_COMPANIES,
  DR_LOCATION_TOKENS,
  SCORING_WEIGHTS,
} from './user-profile';

// ─── Internal types ───────────────────────────────────────────────────────────

type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'unknown';

// ─── Text normalization ───────────────────────────────────────────────────────

function normalize(text: string | null | undefined): string {
  return (text ?? '').toLowerCase();
}

function buildJobText(job: RawJob): string {
  return normalize(
    [job.title, job.description, ...(job.requirements ?? [])].join(' ')
  );
}

// ─── Dutch detection ──────────────────────────────────────────────────────────
// Only flags Dutch when paired with "required / must / vereist" to avoid false
// positives from company names like "Dutch Startup Inc".

const DUTCH_REQUIRED_RE =
  /\b(dutch|nl|nederlands)\b[^.]{0,40}\b(required|must|vereist|noodzakelijk|mandatory)\b|\b(required|must|vereist)[^.]{0,40}\b(dutch|nl|nederlands)\b/i;

function isDutchRequired(job: RawJob): boolean {
  const text = normalize([job.title, job.description, job.location].join(' '));
  return DUTCH_REQUIRED_RE.test(text);
}

// ─── Individual factor scorers ────────────────────────────────────────────────

function skillMatches(skill: string, text: string): boolean {
  // Skills ending in non-word chars (like c#) can't use \b — match literally
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundary = /[a-z0-9]$/.test(skill) ? `${escaped}\\b` : escaped;
  return new RegExp(boundary, 'i').test(text);
}

function scoreSkillMatch(text: string): number {
  // Count how many of the user's core skills appear in the text.
  // Aliases (next.js, tailwind, etc.) also count as a match for the pool
  // but don't inflate the denominator beyond USER_SKILLS.length.
  const aliasHit = USER_SKILL_ALIASES.some((alias) => skillMatches(alias, text));
  const coreMatched = USER_SKILLS.filter((skill) => skillMatches(skill, text)).length;
  // Each alias hit counts as 1 additional skill match (capped at denominator)
  const total = Math.min(coreMatched + (aliasHit ? 1 : 0), USER_SKILLS.length);
  return total / USER_SKILLS.length;
}

function scoreLanguage(job: RawJob): number {
  if (isDutchRequired(job)) return 0;
  return 1.0; // assume English-friendly unless Dutch is required
}

function scoreRemote(job: RawJob): number {
  const location = normalize(job.location);
  const isInDR = DR_LOCATION_TOKENS.some((token) => location.includes(token));

  switch (job.remote_type) {
    case 'remote':  return 1.0;
    case 'hybrid':  return 0.6;
    case 'onsite':  return isInDR ? 0.8 : 0.2;
    default: {
      // Infer from description when remote_type is not set
      const desc = normalize(job.description);
      if (/\b(fully\s+remote|100%\s+remote|remote[\s-]first)\b/.test(desc)) return 1.0;
      if (/\bremote\b/.test(desc)) return 0.75;
      return isInDR ? 0.7 : 0.4;
    }
  }
}

function scoreSeniority(job: RawJob): number {
  const text = normalize([job.title, job.description].join(' '));

  const level = ((): SeniorityLevel => {
    if (/\b(senior|sr\.?|\blead\b|staff\s+engineer|principal|head\s+of|[5-9]\+\s*years?|10\+\s*years?)\b/.test(text)) return 'senior';
    if (/\b(junior|jr\.?|trainee|entry[\s-]level|graduate|intern|starter)\b/.test(text)) return 'junior';
    if (/\b(mid[\s-]level|medior|intermediate|[2-4]\+?\s*years?)\b/.test(text)) return 'mid';
    return 'unknown';
  })();

  const map: Record<SeniorityLevel, number> = {
    junior:  1.0,
    mid:     0.7,
    unknown: 0.7, // optimistic default
    senior:  0.1,
  };
  return map[level];
}

function scoreSalary(job: RawJob): number {
  const currency = (job.salary_currency ?? '').toUpperCase();
  if (currency === 'USD' || currency === 'EUR') {
    if (job.salary_min && job.salary_min >= 30000) return 1.0;
    if (job.salary_min) return 0.75;
    return 0.8; // USD/EUR specified but no amount
  }
  // Check description for currency signals
  const desc = normalize(job.description);
  if (/\busd\b|\beur\b|\$\d|\€\d/.test(desc)) return 0.7;
  return 0.4;
}

function scoreCompanyReputation(job: RawJob): number {
  const name = normalize(job.company);
  const isKnown = [...KNOWN_COMPANIES].some((known) => name.includes(known));
  return isKnown ? 1.0 : 0.4;
}

function scoreLocation(job: RawJob): number {
  if (job.remote_type === 'remote') return 1.0;

  const location = normalize(job.location);
  if (!location) return 0.6;

  if (DR_LOCATION_TOKENS.some((token) => location.includes(token))) return 1.0;

  if (/\b(netherlands|nederland|amsterdam|rotterdam|utrecht)\b/.test(location)) {
    return job.remote_type === 'hybrid' ? 0.5 : 0.2;
  }

  const isUSOrEU = /\b(united states|usa|\bus,|\buk\b|germany|spain|france|europe)\b/.test(location);
  if (isUSOrEU) return job.remote_type === 'hybrid' ? 0.75 : 0.55;

  return 0.45;
}

function scoreGrowth(text: string): number {
  return /\b(mentorship|mentor|learning\s+budget|career\s+path|career\s+growth|training|coaching|development\s+program|upskill|grow\s+with|learning\s+opportunities)\b/.test(text)
    ? 1.0
    : 0.3;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function scoreJob(raw: RawJob): ScoringResult {
  if (isDutchRequired(raw)) {
    return {
      match_score: 0,
      priority_score: 0,
      score_breakdown: {
        skillMatch: 0, language: 0, remote: 0, seniority: 0,
        salary: 0, companyReputation: 0, location: 0, growth: 0,
      },
    };
  }

  const text = buildJobText(raw);

  const breakdown: ScoreBreakdown = {
    skillMatch:        scoreSkillMatch(text),
    language:          scoreLanguage(raw),
    remote:            scoreRemote(raw),
    seniority:         scoreSeniority(raw),
    salary:            scoreSalary(raw),
    companyReputation: scoreCompanyReputation(raw),
    location:          scoreLocation(raw),
    growth:            scoreGrowth(text),
  };

  const match_score =
    breakdown.skillMatch        * SCORING_WEIGHTS.skillMatch +
    breakdown.language          * SCORING_WEIGHTS.language +
    breakdown.remote            * SCORING_WEIGHTS.remote +
    breakdown.seniority         * SCORING_WEIGHTS.seniority +
    breakdown.salary            * SCORING_WEIGHTS.salary +
    breakdown.companyReputation * SCORING_WEIGHTS.companyReputation +
    breakdown.location          * SCORING_WEIGHTS.location +
    breakdown.growth            * SCORING_WEIGHTS.growth;

  return {
    match_score:     Math.round(match_score * 1000) / 1000,
    priority_score:  0, // filled in by priority.ts → scoreAndRankJob()
    score_breakdown: breakdown,
  };
}
