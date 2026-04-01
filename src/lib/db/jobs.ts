import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Job, JobFilters, JobStatus, NewJob } from '@/types';

// ------------------------------------------------------------
// READ (server client — respects RLS)
// ------------------------------------------------------------

export async function getJobs(filters?: JobFilters): Promise<Job[]> {
  const supabase = await createClient();

  let query = supabase
    .from('jobs')
    .select('*')
    .order('priority_score', { ascending: false });

  if (filters?.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    query = query.in('status', statuses);
  }

  if (filters?.minScore !== undefined) {
    query = query.gte('match_score', filters.minScore);
  }

  if (filters?.maxScore !== undefined) {
    query = query.lte('match_score', filters.maxScore);
  }

  if (filters?.remoteType) {
    query = query.eq('remote_type', filters.remoteType);
  }

  if (filters?.source) {
    query = query.eq('source', filters.source);
  }

  if (filters?.keyword) {
    query = query.or(
      `title.ilike.%${filters.keyword}%,company.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`
    );
  }

  if (filters?.postedAfter) {
    query = query.gte('posted_at', filters.postedAfter);
  }

  if (filters?.limit !== undefined) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset !== undefined) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;

  if (error) throw new Error(`getJobs failed: ${error.message}`);
  return (data ?? []) as Job[];
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`getJob failed: ${error.message}`);
  }

  return data as Job;
}

// ------------------------------------------------------------
// WRITE (server client — authenticated user writes)
// ------------------------------------------------------------

export async function updateJobStatus(
  id: string,
  status: JobStatus
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('jobs')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`updateJobStatus failed: ${error.message}`);
}

export async function updateJobNotes(
  id: string,
  notes: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('jobs')
    .update({ notes })
    .eq('id', id);

  if (error) throw new Error(`updateJobNotes failed: ${error.message}`);
}

// ------------------------------------------------------------
// PRIVILEGED WRITE (admin client — used by scraper)
// ------------------------------------------------------------

/**
 * Insert or update a job by external_id.
 * Called by the scraper — uses service role to bypass RLS.
 */
export async function upsertJob(job: NewJob): Promise<Job> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .upsert(job, { onConflict: 'external_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw new Error(`upsertJob failed: ${error.message}`);
  return data as Job;
}

export async function markNotificationSent(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('jobs')
    .update({ notification_sent: true })
    .eq('id', id);

  if (error)
    throw new Error(`markNotificationSent failed: ${error.message}`);
}
