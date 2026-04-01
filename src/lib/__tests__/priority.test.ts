import { describe, it, expect } from 'vitest';
import { computePriorityScore, scoreAndRankJob, rankJobs } from '../priority';
import type { RawJob, ScoringResult } from '@/types';

const NOW = new Date('2026-04-01T12:00:00Z');

function daysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeRaw(overrides: Partial<RawJob> = {}): RawJob {
  return {
    external_id: 'test-001',
    title: 'Frontend Developer',
    company: 'Test Co',
    url: 'https://example.com/job',
    source: 'manual',
    ...overrides,
  };
}

const mockScoring = (match_score: number): ScoringResult => ({
  match_score,
  priority_score: 0,
  score_breakdown: {
    skillMatch: match_score, language: 1, remote: 1, seniority: 1,
    salary: 1, companyReputation: 0.5, location: 1, growth: 0.5,
  },
});

describe('computePriorityScore', () => {
  it('returns a value between 0 and 1', () => {
    const score = computePriorityScore(
      mockScoring(0.8),
      makeRaw({ posted_at: daysFromNow(-2), expires_at: null }),
      NOW
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('higher match_score produces higher priority', () => {
    const high = computePriorityScore(mockScoring(0.95), makeRaw({ posted_at: daysFromNow(-3) }), NOW);
    const low  = computePriorityScore(mockScoring(0.40), makeRaw({ posted_at: daysFromNow(-3) }), NOW);
    expect(high).toBeGreaterThan(low);
  });

  it('fresh job (1 day ago) ranks higher than old job (25 days ago)', () => {
    const fresh = computePriorityScore(mockScoring(0.8), makeRaw({ posted_at: daysFromNow(-1) }), NOW);
    const old   = computePriorityScore(mockScoring(0.8), makeRaw({ posted_at: daysFromNow(-25) }), NOW);
    expect(fresh).toBeGreaterThan(old);
  });

  it('null posted_at uses neutral freshness (0.5)', () => {
    const withDate    = computePriorityScore(mockScoring(0.8), makeRaw({ posted_at: daysFromNow(-1) }), NOW);
    const withoutDate = computePriorityScore(mockScoring(0.8), makeRaw({ posted_at: null }), NOW);
    // neutral (0.5) is less than max freshness (1.0) for a fresh post
    expect(withDate).toBeGreaterThan(withoutDate);
  });

  it('imminent deadline (2 days) ranks higher than distant deadline (60 days)', () => {
    const urgent  = computePriorityScore(mockScoring(0.8), makeRaw({ posted_at: daysFromNow(-3), expires_at: daysFromNow(2) }), NOW);
    const distant = computePriorityScore(mockScoring(0.8), makeRaw({ posted_at: daysFromNow(-3), expires_at: daysFromNow(60) }), NOW);
    expect(urgent).toBeGreaterThan(distant);
  });

  it('null expires_at uses neutral deadline (0.5)', () => {
    const urgentDeadline = computePriorityScore(mockScoring(0.8), makeRaw({ expires_at: daysFromNow(2) }), NOW);
    const noDeadline     = computePriorityScore(mockScoring(0.8), makeRaw({ expires_at: null }), NOW);
    expect(urgentDeadline).toBeGreaterThan(noDeadline);
  });

  it('expired job (expires_at in the past) returns 0', () => {
    const expired = computePriorityScore(
      mockScoring(0.95),
      makeRaw({ expires_at: daysFromNow(-5) }),
      NOW
    );
    expect(expired).toBe(0);
  });

  it('known company ranks higher than unknown', () => {
    const known   = computePriorityScore(mockScoring(0.8), makeRaw({ company: 'Google' }), NOW);
    const unknown = computePriorityScore(mockScoring(0.8), makeRaw({ company: 'Unknown Startup' }), NOW);
    expect(known).toBeGreaterThan(unknown);
  });
});

describe('scoreAndRankJob', () => {
  it('returns ScoringResult with priority_score > 0 for a valid job', () => {
    const job = makeRaw({
      title: 'Junior React Developer',
      remote_type: 'remote',
      salary_currency: 'USD',
      posted_at: daysFromNow(-2),
    });
    const result = scoreAndRankJob(job, NOW);
    expect(result.priority_score).toBeGreaterThan(0);
    expect(result.match_score).toBeGreaterThan(0);
    expect(result.score_breakdown).toBeDefined();
  });

  it('returns priority_score 0 for Dutch-required job', () => {
    const job = makeRaw({ description: 'Dutch required. React developer.' });
    expect(scoreAndRankJob(job, NOW).priority_score).toBe(0);
  });
});

describe('rankJobs', () => {
  it('returns jobs sorted descending by priority_score', () => {
    const jobs = [
      makeRaw({ title: 'Senior Java Dev', description: 'Java only, senior, Dutch required.' }),
      makeRaw({ title: 'Junior React Dev', remote_type: 'remote', salary_currency: 'USD', posted_at: daysFromNow(-1) }),
      makeRaw({ title: 'Mid Frontend Dev', remote_type: 'hybrid', salary_currency: 'EUR', posted_at: daysFromNow(-10) }),
    ];
    const ranked = rankJobs(jobs, NOW);
    expect(ranked[0]!.priority_score).toBeGreaterThanOrEqual(ranked[1]!.priority_score);
    expect(ranked[1]!.priority_score).toBeGreaterThanOrEqual(ranked[2]!.priority_score);
  });

  it('Dutch-required job ends up last', () => {
    const jobs = [
      makeRaw({ title: 'Junior React Dev', remote_type: 'remote', posted_at: daysFromNow(-1) }),
      makeRaw({ description: 'Dutch required.' }),
    ];
    const ranked = rankJobs(jobs, NOW);
    expect(ranked[ranked.length - 1]!.priority_score).toBe(0);
  });

  it('handles empty array', () => {
    expect(rankJobs([], NOW)).toEqual([]);
  });

  it('handles single-element array', () => {
    const jobs = [makeRaw()];
    expect(rankJobs(jobs, NOW)).toHaveLength(1);
  });
});
