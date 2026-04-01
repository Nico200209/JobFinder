import type { ScoreBreakdown } from '@/types';

// Nicolás García's profile — update as skills evolve

// Core skills used as the scoring denominator (one entry per distinct skill)
export const USER_SKILLS = [
  'react', 'html', 'css', 'javascript', 'typescript',
  'c#', 'unity', 'figma', 'git', 'nuke', 'postman',
] as const;

// Additional aliases that also count as a match for core skills in text scanning
// These do NOT inflate the denominator — they just help with variant spellings
export const USER_SKILL_ALIASES = [
  'next.js', 'nextjs', 'next js', 'tailwind', 'tailwindcss',
  'node', 'node.js', 'nodejs', 'reactjs', 'react.js',
] as const;

export const KNOWN_COMPANIES = [
  'google', 'microsoft', 'apple', 'meta', 'amazon', 'netflix', 'spotify',
  'stripe', 'shopify', 'notion', 'figma', 'vercel', 'supabase', 'github',
  'atlassian', 'slack', 'airbnb', 'uber', 'twilio', 'datadog', 'cloudflare',
  'epic games', 'riot games', 'riot', 'unity technologies', 'ubisoft',
  'electronic arts', 'ea games', 'activision', 'blizzard', 'square enix',
  'capcom', 'bandai namco', 'cd projekt', 'valve', '2k games', 'bethesda',
] as const;

export const DR_LOCATION_TOKENS = [
  'santo domingo', 'dominican republic', 'república dominicana',
] as const;

// `satisfies` ensures this covers every key of ScoreBreakdown at compile time.
// If a new factor is added to ScoreBreakdown, this file will fail to compile.
export const SCORING_WEIGHTS = {
  skillMatch:        0.30,
  language:          0.20,
  remote:            0.15,
  seniority:         0.10,
  salary:            0.10,
  companyReputation: 0.05,
  location:          0.05,
  growth:            0.05,
} as const satisfies Record<keyof ScoreBreakdown, number>;

export const PRIORITY_WEIGHTS = {
  matchScore:  0.50,
  freshness:   0.25,
  deadline:    0.15,
  companyTier: 0.10,
} as const;

// Posts older than this decay to 0 freshness
export const FRESHNESS_MAX_AGE_DAYS = 30;
// Deadline within this many days → max urgency score
export const DEADLINE_URGENCY_DAYS = 7;
