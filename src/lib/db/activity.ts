import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ActivityLog } from '@/types';

// ------------------------------------------------------------
// READ (server client — respects RLS)
// ------------------------------------------------------------

export async function getActivityLog(jobId: string): Promise<ActivityLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getActivityLog failed: ${error.message}`);
  return (data ?? []) as ActivityLog[];
}

// ------------------------------------------------------------
// WRITE (admin client — service role bypasses RLS for inserts)
// ------------------------------------------------------------

export async function logActivity(
  jobId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from('activity_log').insert({
    job_id: jobId,
    action,
    details: details ?? null,
  });

  if (error) throw new Error(`logActivity failed: ${error.message}`);
}
