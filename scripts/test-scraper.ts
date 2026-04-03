/**
 * Test script for the scraper pipeline.
 *
 * Usage:
 *   npm run test:scraper          → offline mode (mock jobs, no API calls)
 *   npm run test:scraper -- --live → live mode (calls real APIs — use sparingly!)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local before any imports that need env vars
config({ path: resolve(process.cwd(), '.env.local') });

import { scrapeAllSources, fetchFromRemotive, fetchFromArbeitnow } from '../src/lib/scraper';
import { scoreAndRankJob } from '../src/lib/priority';
import type { RawJob, SearchCriteria } from '../src/types';

// ---------------------------------------------------------------
// Mock data for offline testing
// ---------------------------------------------------------------

const MOCK_JOBS: RawJob[] = [
  {
    external_id: 'test_001',
    title: 'Junior Frontend Developer (React)',
    company: 'Acme Corp',
    location: 'Remote',
    remote_type: 'remote',
    description:
      'We are looking for a junior frontend developer with experience in React, TypeScript, and Tailwind CSS. ' +
      'You will build UI components, collaborate with the design team using Figma, and contribute to our Next.js app. ' +
      'English required. Mentorship and learning budget provided.',
    url: 'https://example.com/job/001',
    source: 'jsearch',
    posted_at: new Date().toISOString(),
  },
  {
    external_id: 'test_002',
    title: 'Senior Game Developer',
    company: 'Big Studio',
    location: 'Amsterdam, NL (on-site)',
    remote_type: 'onsite',
    description:
      'Senior Unity developer needed. 7+ years experience required. Dutch language mandatory (vereist). ' +
      'C# expertise essential. Lead a team of 5.',
    url: 'https://example.com/job/002',
    source: 'arbeitnow',
    posted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: 'test_003',
    title: 'Technical Game Designer',
    company: 'Indie Games Studio',
    location: 'Remote – Worldwide',
    remote_type: 'remote',
    description:
      'We need a technical game designer who can write GDD/FDD documentation, prototype mechanics in Unity with C#, ' +
      'and create UX flows in Figma. Experience with React a bonus. English-only team. ' +
      'Career growth and mentorship program available.',
    salary_min: 45000,
    salary_max: 65000,
    salary_currency: 'USD',
    url: 'https://example.com/job/003',
    source: 'remotive',
    posted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
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
];

const TEST_CRITERIA: SearchCriteria = {
  id: 'test',
  keywords: ['react', 'game designer', 'frontend developer'],
  excluded_keywords: null,
  locations: null,
  remote_only: true,
  min_salary: null,
  max_results_per_run: 20,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------
// Offline mode — score mock jobs, no network calls
// ---------------------------------------------------------------

function runOfflineTest(): void {
  console.log('=== OFFLINE MODE — Mock Job Scoring ===\n');
  const now = new Date();

  for (const raw of MOCK_JOBS) {
    const result = scoreAndRankJob(raw, now);
    const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

    console.log(`📋 ${raw.title} @ ${raw.company}`);
    console.log(`   Source:    ${raw.source}`);
    console.log(`   Location:  ${raw.location ?? 'n/a'} (${raw.remote_type ?? 'unknown'})`);
    console.log(`   Match:     ${pct(result.match_score)}  Priority: ${pct(result.priority_score)}`);
    console.log(`   Breakdown:`);
    const bd = result.score_breakdown;
    console.log(
      `     skill=${pct(bd.skillMatch)}  lang=${pct(bd.language)}  remote=${pct(bd.remote)}  seniority=${pct(bd.seniority)}`
    );
    console.log(
      `     salary=${pct(bd.salary)}  company=${pct(bd.companyReputation)}  location=${pct(bd.location)}  growth=${pct(bd.growth)}`
    );
    console.log();
  }

  console.log('✅ Offline test complete — no API calls made.');
}

// ---------------------------------------------------------------
// Live mode — call real APIs (use sparingly!)
// ---------------------------------------------------------------

async function runLiveTest(): Promise<void> {
  console.log('=== LIVE MODE — Real API Calls ===\n');
  console.log('⚠️  This uses real API quota. JSearch counts against 200/month free tier.\n');

  const start = Date.now();

  // Test Remotive and Arbeitnow (free, no key)
  console.log('Testing Remotive...');
  try {
    const remotive = await fetchFromRemotive(TEST_CRITERIA.keywords, 10);
    console.log(`  ✅ Remotive: ${remotive.length} jobs matched keywords`);
    if (remotive[0]) {
      console.log(`     Sample: "${remotive[0].title}" @ ${remotive[0].company}`);
    }
  } catch (err) {
    console.error(`  ❌ Remotive failed: ${err instanceof Error ? err.message : err}`);
  }

  console.log('Testing Arbeitnow...');
  try {
    const arbeitnow = await fetchFromArbeitnow(TEST_CRITERIA.keywords, 10);
    console.log(`  ✅ Arbeitnow: ${arbeitnow.length} jobs matched keywords`);
    if (arbeitnow[0]) {
      console.log(`     Sample: "${arbeitnow[0].title}" @ ${arbeitnow[0].company}`);
    }
  } catch (err) {
    console.error(`  ❌ Arbeitnow failed: ${err instanceof Error ? err.message : err}`);
  }

  if (!process.env.RAPIDAPI_KEY) {
    console.log('\nSkipping JSearch (RAPIDAPI_KEY not set).');
  } else {
    console.log('\nTesting full scrapeAllSources (includes JSearch)...');
    try {
      const { jobs, sourceResults } = await scrapeAllSources(TEST_CRITERIA);
      console.log(`\n📊 Source Results:`);
      for (const sr of sourceResults) {
        const status = sr.error ? `❌ error: ${sr.error}` : `✅ ${sr.fetched} jobs`;
        console.log(`   ${sr.source}: ${status}`);
      }
      console.log(`\n📦 Total unique jobs after dedup: ${jobs.length}`);

      const now = new Date();
      const highMatch = jobs.filter((j) => scoreAndRankJob(j, now).match_score >= 0.85);
      console.log(`🎯 High match (≥85%): ${highMatch.length}`);
    } catch (err) {
      console.error(`❌ scrapeAllSources failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n⏱️  Duration: ${Date.now() - start}ms`);
}

// ---------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------

const isLive = process.argv.includes('--live');

if (isLive) {
  runLiveTest().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  runOfflineTest();
}
