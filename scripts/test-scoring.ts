// Run with: npm run test:scoring
import { scoreAndRankJob } from '../src/lib/priority';
import type { RawJob } from '../src/types';

const NOW = new Date();
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString(); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000).toISOString(); }

const SAMPLES: Array<{ label: string; job: RawJob }> = [
  {
    label: 'Ideal: Junior Remote React @ Vercel (USD)',
    job: {
      external_id: 's1', title: 'Junior React Developer', company: 'Vercel',
      description: 'Remote-first. Junior React/TypeScript developer. English team. Mentorship program. USD salary.',
      requirements: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Git'],
      remote_type: 'remote', salary_currency: 'USD', salary_min: 55000,
      url: 'https://example.com', source: 'remotive',
      posted_at: daysAgo(2), expires_at: daysFromNow(14),
    },
  },
  {
    label: 'Good: Trainee Game Designer @ Riot Games (Remote)',
    job: {
      external_id: 's2', title: 'Trainee Game Designer', company: 'Riot Games',
      description: 'Entry-level game designer. Unity, C#, system design. Remote. USD.',
      requirements: ['Unity', 'C#', 'Figma'],
      remote_type: 'remote', salary_currency: 'USD',
      url: 'https://example.com', source: 'jsearch',
      posted_at: daysAgo(5), expires_at: daysFromNow(7),
    },
  },
  {
    label: 'OK: Mid Frontend @ Unknown Agency (Hybrid EUR)',
    job: {
      external_id: 's3', title: 'Mid-level Frontend Developer', company: 'Remote Agency',
      description: 'React and TypeScript. Hybrid. EUR salary.',
      remote_type: 'hybrid', salary_currency: 'EUR',
      url: 'https://example.com', source: 'arbeitnow',
      posted_at: daysAgo(12),
    },
  },
  {
    label: 'Bad: Senior Lead @ Dutch Fintech (Dutch Required)',
    job: {
      external_id: 's4', title: 'Senior Lead Engineer', company: 'Dutch Fintech BV',
      description: 'Dutch required. Must speak dutch. 5+ years experience. On-site Amsterdam.',
      remote_type: 'onsite', location: 'Amsterdam, Netherlands',
      url: 'https://example.com', source: 'arbeitnow',
      posted_at: daysAgo(1),
    },
  },
  {
    label: 'DR Onsite: React Dev in Santo Domingo (USD)',
    job: {
      external_id: 's5', title: 'React Developer', company: 'DR Tech Studio',
      description: 'Junior React developer for our Santo Domingo office. English OK. USD.',
      remote_type: 'onsite', location: 'Santo Domingo, Dominican Republic',
      salary_currency: 'USD',
      url: 'https://example.com', source: 'jsearch',
      posted_at: daysAgo(3), expires_at: daysFromNow(10),
    },
  },
  {
    label: 'No-code: Mendix Trainee (Remote, English)',
    job: {
      external_id: 's6', title: 'No-Code Developer Trainee', company: 'Low-Code Labs',
      description: 'Trainee for Mendix and OutSystems. 100% remote. English-speaking team. Learning budget included.',
      remote_type: 'remote', salary_currency: 'EUR',
      url: 'https://example.com', source: 'remotive',
      posted_at: daysAgo(8), expires_at: daysFromNow(5),
    },
  },
];

const LINE = '─'.repeat(72);
console.log('\nJobRadar Scoring Smoke Test');
console.log(LINE);
console.log(`${'Label'.padEnd(48)} ${'Match'.padStart(6)} ${'Priority'.padStart(9)}`);
console.log(LINE);

const results = SAMPLES.map(({ label, job }) => ({
  label,
  ...scoreAndRankJob(job, NOW),
}));

for (const r of results) {
  const matchPct = (r.match_score * 100).toFixed(1).padStart(5) + '%';
  const priPct   = (r.priority_score * 100).toFixed(1).padStart(8) + '%';
  console.log(`${r.label.padEnd(48)} ${matchPct} ${priPct}`);
}

console.log(LINE);
console.log('\nBreakdown for highest-scoring job:');
const best = [...results].sort((a, b) => b.match_score - a.match_score)[0]!;
console.log(`  ${best.label}`);
for (const [key, val] of Object.entries(best.score_breakdown)) {
  const bar = '█'.repeat(Math.round((val as number) * 10)).padEnd(10);
  console.log(`  ${key.padEnd(20)} ${bar} ${((val as number) * 100).toFixed(0)}%`);
}
console.log();
