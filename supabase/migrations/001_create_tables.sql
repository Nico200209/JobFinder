-- ============================================================
-- JobRadar — Migration 001: Create all tables
-- ============================================================

-- ------------------------------------------------------------
-- JOBS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id         TEXT        UNIQUE,
  title               TEXT        NOT NULL,
  company             TEXT        NOT NULL,
  company_logo_url    TEXT,
  location            TEXT,
  remote_type         TEXT        CHECK (remote_type IN ('remote', 'hybrid', 'onsite')),
  description         TEXT,
  requirements        TEXT[],
  salary_min          INTEGER,
  salary_max          INTEGER,
  salary_currency     TEXT        DEFAULT 'USD',
  url                 TEXT        NOT NULL,
  source              TEXT        NOT NULL,
  posted_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  match_score         REAL        NOT NULL DEFAULT 0,
  priority_score      REAL        NOT NULL DEFAULT 0,
  score_breakdown     JSONB,
  status              TEXT        DEFAULT 'new' CHECK (status IN (
                        'new', 'reviewing', 'applied', 'interview',
                        'offer', 'rejected', 'ghosted', 'saved', 'archived'
                      )),
  status_updated_at   TIMESTAMPTZ DEFAULT NOW(),
  notes               TEXT,
  notification_sent   BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_match_score    ON jobs (match_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_priority_score ON jobs (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status         ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at     ON jobs (created_at DESC);

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read jobs"
  ON jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Service role can insert jobs"
  ON jobs FOR INSERT TO service_role WITH CHECK (true);

-- ------------------------------------------------------------
-- ACTIVITY LOG TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id     UUID        REFERENCES jobs (id) ON DELETE CASCADE,
  action     TEXT        NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity"
  ON activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert activity"
  ON activity_log FOR INSERT TO service_role WITH CHECK (true);

-- ------------------------------------------------------------
-- SEARCH CRITERIA TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_criteria (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords             TEXT[]      NOT NULL,
  excluded_keywords    TEXT[],
  locations            TEXT[],
  remote_only          BOOLEAN     DEFAULT FALSE,
  min_salary           INTEGER,
  max_results_per_run  INTEGER     DEFAULT 50,
  active               BOOLEAN     DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE search_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read criteria"
  ON search_criteria FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update criteria"
  ON search_criteria FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert criteria"
  ON search_criteria FOR INSERT TO authenticated WITH CHECK (true);

-- ------------------------------------------------------------
-- Auto-update updated_at on jobs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER search_criteria_updated_at
  BEFORE UPDATE ON search_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
