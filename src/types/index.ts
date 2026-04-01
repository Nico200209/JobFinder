// ============================================================
// JobRadar — Global TypeScript Types
// ============================================================

// ------------------------------------------------------------
// Enums / Union Types
// ------------------------------------------------------------

export type JobStatus =
  | 'new'
  | 'reviewing'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'ghosted'
  | 'saved'
  | 'archived';

export type RemoteType = 'remote' | 'hybrid' | 'onsite';

export type JobSource = 'jsearch' | 'remotive' | 'arbeitnow' | 'torre' | 'getonboard' | 'manual';

// ------------------------------------------------------------
// Score Types
// ------------------------------------------------------------

export interface ScoreBreakdown {
  skillMatch: number;      // 0–1
  language: number;        // 0–1
  remote: number;          // 0–1
  seniority: number;       // 0–1
  salary: number;          // 0–1
  companyReputation: number; // 0–1
  location: number;        // 0–1
  growth: number;          // 0–1
}

// ------------------------------------------------------------
// Database Record Interfaces
// ------------------------------------------------------------

export interface Job {
  id: string;
  external_id: string | null;
  title: string;
  company: string;
  company_logo_url: string | null;
  location: string | null;
  remote_type: RemoteType | null;
  description: string | null;
  requirements: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  url: string;
  source: string;
  posted_at: string | null;
  expires_at: string | null;
  match_score: number;
  priority_score: number;
  score_breakdown: ScoreBreakdown | null;
  status: JobStatus;
  status_updated_at: string;
  notes: string | null;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  job_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SearchCriteria {
  id: string;
  keywords: string[];
  excluded_keywords: string[] | null;
  locations: string[] | null;
  remote_only: boolean;
  min_salary: number | null;
  max_results_per_run: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Query / Filter Types
// ------------------------------------------------------------

export interface JobFilters {
  status?: JobStatus | JobStatus[];
  minScore?: number;
  maxScore?: number;
  remoteType?: RemoteType;
  source?: string;
  keyword?: string;
  postedAfter?: string;
  limit?: number;
  offset?: number;
}

// ------------------------------------------------------------
// API / Scraper Types
// ------------------------------------------------------------

/** Shape passed to upsertJob — no generated fields */
export type NewJob = Omit<Job, 'id' | 'created_at' | 'updated_at'>;

/** Raw job data before scoring, from any source API */
export interface RawJob {
  external_id: string;
  title: string;
  company: string;
  company_logo_url?: string;
  location?: string;
  remote_type?: RemoteType;
  description?: string;
  requirements?: string[];
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  url: string;
  source: JobSource;
  posted_at?: string;
  expires_at?: string;
}

// ------------------------------------------------------------
// Scoring Output
// ------------------------------------------------------------

export interface ScoringResult {
  match_score: number;       // 0–1
  priority_score: number;    // 0–1
  score_breakdown: ScoreBreakdown;
}

// ------------------------------------------------------------
// Scraper / Run Summary Types
// ------------------------------------------------------------

export interface SourceResult {
  source: JobSource;
  fetched: number;
  error: string | null;
}

export interface ScrapeRunSummary {
  ran_at: string;
  sources: SourceResult[];
  total_fetched: number;
  total_upserted: number;
  duration_ms: number;
  errors: string[];
}
