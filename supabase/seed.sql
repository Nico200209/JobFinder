-- ============================================================
-- JobRadar — Seed: Initial search criteria for Nicolás García
-- Run this AFTER 001_create_tables.sql
-- ============================================================

INSERT INTO search_criteria (
  keywords,
  excluded_keywords,
  locations,
  remote_only,
  min_salary,
  max_results_per_run,
  active
) VALUES (
  ARRAY[
    'react',
    'typescript',
    'next.js',
    'nextjs',
    'frontend developer',
    'front-end developer',
    'game designer',
    'technical game designer',
    'unity',
    'ui/ux',
    'ux designer',
    'product designer',
    'low-code',
    'no-code',
    'mendix',
    'outsystems',
    'bubble',
    'retool',
    'powerapps',
    'creative technologist',
    'technical writer',
    'qa engineer',
    'game developer',
    'junior developer',
    'trainee'
  ],
  ARRAY[
    'dutch required',
    'vereiste',
    'alleen nederlands',
    'c++ required',
    'java required',
    '.net required',
    '5+ years',
    '7+ years',
    '10+ years',
    'senior only',
    'staff engineer',
    'principal engineer'
  ],
  ARRAY[
    'remote',
    'worldwide',
    'global',
    'santo domingo',
    'dominican republic',
    'united states',
    'europe'
  ],
  true,
  null,
  50,
  true
);
