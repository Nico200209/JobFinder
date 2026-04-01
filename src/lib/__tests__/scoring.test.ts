import { describe, it, expect } from 'vitest';
import { scoreJob } from '../scoring';
import type { RawJob } from '@/types';

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

describe('scoreJob', () => {
  describe('return shape', () => {
    it('returns match_score between 0 and 1', () => {
      const { match_score } = scoreJob(makeRaw());
      expect(match_score).toBeGreaterThanOrEqual(0);
      expect(match_score).toBeLessThanOrEqual(1);
    });

    it('returns score_breakdown with all 8 factors', () => {
      const { score_breakdown } = scoreJob(makeRaw());
      const keys = ['skillMatch', 'language', 'remote', 'seniority', 'salary', 'companyReputation', 'location', 'growth'];
      for (const key of keys) {
        expect(score_breakdown).toHaveProperty(key);
        expect((score_breakdown as Record<string, number>)[key]).toBeGreaterThanOrEqual(0);
        expect((score_breakdown as Record<string, number>)[key]).toBeLessThanOrEqual(1);
      }
    });

    it('returns priority_score as 0 (set by priority.ts, not scoreJob)', () => {
      expect(scoreJob(makeRaw()).priority_score).toBe(0);
    });
  });

  describe('SCORING_WEIGHTS sum to 1.0', () => {
    it('weights add up to exactly 1.0', async () => {
      const { SCORING_WEIGHTS } = await import('../user-profile');
      const sum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('Dutch auto-disqualify', () => {
    it('returns match_score 0 when description says "Dutch required"', () => {
      expect(scoreJob(makeRaw({ description: 'Dutch required. React experience needed.' })).match_score).toBe(0);
    });

    it('returns match_score 0 for "must speak dutch"', () => {
      expect(scoreJob(makeRaw({ description: 'You must speak dutch fluently.' })).match_score).toBe(0);
    });

    it('returns match_score 0 for "vereiste taal: nederlands"', () => {
      expect(scoreJob(makeRaw({ description: 'Vereiste taal: Nederlands' })).match_score).toBe(0);
    });

    it('does NOT disqualify when "dutch" appears in company name only', () => {
      const job = makeRaw({ company: 'Dutch Startup Inc', description: 'React developer role, English speaking team.' });
      expect(scoreJob(job).match_score).toBeGreaterThan(0);
    });

    it('sets all breakdown scores to 0 when Dutch required', () => {
      const { score_breakdown } = scoreJob(makeRaw({ description: 'Dutch required.' }));
      for (const value of Object.values(score_breakdown)) {
        expect(value).toBe(0);
      }
    });
  });

  describe('skillMatch factor', () => {
    it('returns a positive skill score when user skills are mentioned', () => {
      const job = makeRaw({ description: 'react typescript javascript html css figma git', requirements: [] });
      expect(scoreJob(job).score_breakdown.skillMatch).toBeGreaterThan(0.3);
    });

    it('returns 0 skill score when no matching skills found', () => {
      const job = makeRaw({ description: 'Java Spring Boot Kubernetes AWS', requirements: ['Java', 'Kubernetes'] });
      expect(scoreJob(job).score_breakdown.skillMatch).toBe(0);
    });

    it('skill detection is case-insensitive', () => {
      const lower = makeRaw({ description: 'react typescript' });
      const upper = makeRaw({ description: 'REACT TYPESCRIPT' });
      expect(scoreJob(lower).score_breakdown.skillMatch).toBe(scoreJob(upper).score_breakdown.skillMatch);
    });

    it('also scans requirements array for skills', () => {
      const withReqs = makeRaw({ description: 'Great team.', requirements: ['React', 'TypeScript', 'Git'] });
      const noReqs = makeRaw({ description: 'Great team.', requirements: [] });
      expect(scoreJob(withReqs).score_breakdown.skillMatch).toBeGreaterThan(scoreJob(noReqs).score_breakdown.skillMatch);
    });
  });

  describe('language factor', () => {
    it('returns 1.0 when no language restriction (assume English-friendly)', () => {
      expect(scoreJob(makeRaw({ description: 'React developer role.' })).score_breakdown.language).toBeGreaterThanOrEqual(0.9);
    });

    it('returns 0 for Dutch-required postings', () => {
      expect(scoreJob(makeRaw({ description: 'Dutch required.' })).score_breakdown.language).toBe(0);
    });
  });

  describe('remote factor', () => {
    it('returns 1.0 when remote_type is "remote"', () => {
      expect(scoreJob(makeRaw({ remote_type: 'remote' })).score_breakdown.remote).toBe(1.0);
    });

    it('returns 0.6 when remote_type is "hybrid"', () => {
      expect(scoreJob(makeRaw({ remote_type: 'hybrid' })).score_breakdown.remote).toBe(0.6);
    });

    it('returns 0.2 when onsite and not in DR', () => {
      expect(scoreJob(makeRaw({ remote_type: 'onsite', location: 'New York, US' })).score_breakdown.remote).toBe(0.2);
    });

    it('returns 0.8 when onsite and location is Santo Domingo', () => {
      expect(scoreJob(makeRaw({ remote_type: 'onsite', location: 'Santo Domingo, Dominican Republic' })).score_breakdown.remote).toBe(0.8);
    });

    it('gives higher remote score to fully remote vs onsite non-DR', () => {
      const remote = scoreJob(makeRaw({ remote_type: 'remote' })).score_breakdown.remote;
      const onsite = scoreJob(makeRaw({ remote_type: 'onsite', location: 'Amsterdam' })).score_breakdown.remote;
      expect(remote).toBeGreaterThan(onsite);
    });
  });

  describe('seniority factor', () => {
    it('returns 1.0 for "Junior Frontend Developer"', () => {
      expect(scoreJob(makeRaw({ title: 'Junior Frontend Developer' })).score_breakdown.seniority).toBe(1.0);
    });

    it('returns 1.0 for "Trainee Game Designer"', () => {
      expect(scoreJob(makeRaw({ title: 'Trainee Game Designer' })).score_breakdown.seniority).toBe(1.0);
    });

    it('returns 0.1 for senior/lead roles', () => {
      const job = makeRaw({ title: 'Senior Lead Engineer', description: '5+ years required.' });
      expect(scoreJob(job).score_breakdown.seniority).toBe(0.1);
    });

    it('returns 0.7 (optimistic default) when no seniority signal', () => {
      expect(scoreJob(makeRaw({ title: 'Developer', description: 'Great role.' })).score_breakdown.seniority).toBe(0.7);
    });
  });

  describe('salary factor', () => {
    it('returns 1.0 for USD salary', () => {
      expect(scoreJob(makeRaw({ salary_currency: 'USD', salary_min: 50000 })).score_breakdown.salary).toBe(1.0);
    });

    it('returns 1.0 for EUR salary', () => {
      expect(scoreJob(makeRaw({ salary_currency: 'EUR', salary_min: 40000 })).score_breakdown.salary).toBe(1.0);
    });

    it('returns 0.4 when no salary info at all', () => {
      expect(scoreJob(makeRaw({ description: 'Competitive salary.' })).score_breakdown.salary).toBe(0.4);
    });
  });

  describe('companyReputation factor', () => {
    it('returns 1.0 for Riot Games', () => {
      expect(scoreJob(makeRaw({ company: 'Riot Games' })).score_breakdown.companyReputation).toBe(1.0);
    });

    it('returns 1.0 for known companies (case-insensitive)', () => {
      expect(scoreJob(makeRaw({ company: 'VERCEL' })).score_breakdown.companyReputation).toBe(1.0);
    });

    it('returns 0.4 for unknown companies', () => {
      expect(scoreJob(makeRaw({ company: 'Random Startup XYZ' })).score_breakdown.companyReputation).toBe(0.4);
    });
  });

  describe('location factor', () => {
    it('returns 1.0 for remote jobs regardless of listed location', () => {
      expect(scoreJob(makeRaw({ remote_type: 'remote', location: 'Amsterdam' })).score_breakdown.location).toBe(1.0);
    });

    it('returns 1.0 for Santo Domingo location', () => {
      expect(scoreJob(makeRaw({ remote_type: 'onsite', location: 'Santo Domingo, Dominican Republic' })).score_breakdown.location).toBe(1.0);
    });

    it('returns low score for onsite Netherlands', () => {
      expect(scoreJob(makeRaw({ remote_type: 'onsite', location: 'Amsterdam, Netherlands' })).score_breakdown.location).toBeLessThan(0.3);
    });
  });

  describe('growth factor', () => {
    it('returns 1.0 when description mentions mentorship', () => {
      expect(scoreJob(makeRaw({ description: 'We offer a mentorship program and career path.' })).score_breakdown.growth).toBe(1.0);
    });

    it('returns 0.3 when no growth signals', () => {
      expect(scoreJob(makeRaw({ description: 'Standard role. Send CV.' })).score_breakdown.growth).toBe(0.3);
    });
  });

  describe('overall match_score thresholds', () => {
    it('ideal remote junior React USD role scores above 0.80', () => {
      const job = makeRaw({
        title: 'Junior React Developer',
        company: 'Vercel',
        description: 'Remote position. We need a junior React and TypeScript developer. English team. Mentorship included.',
        remote_type: 'remote',
        requirements: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Git'],
        salary_currency: 'USD',
        salary_min: 50000,
      });
      expect(scoreJob(job).match_score).toBeGreaterThan(0.80);
    });

    it('senior onsite Dutch Netherlands job scores 0', () => {
      const job = makeRaw({
        title: 'Senior Lead Engineer',
        description: 'Dutch required. 5+ years experience. On-site only.',
        remote_type: 'onsite',
        location: 'Amsterdam, Netherlands',
      });
      expect(scoreJob(job).match_score).toBe(0);
    });
  });
});
