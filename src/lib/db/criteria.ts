import { createClient } from '@/lib/supabase/server';
import type { SearchCriteria } from '@/types';

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

/** Returns the first active search criteria row, or null if none exist. */
export async function getSearchCriteria(): Promise<SearchCriteria | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('search_criteria')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getSearchCriteria failed: ${error.message}`);
  return data as SearchCriteria | null;
}

// ------------------------------------------------------------
// WRITE
// ------------------------------------------------------------

/**
 * Update existing criteria by id, or insert a new row if no id provided.
 * Authenticated users can manage criteria from the Settings page.
 */
export async function upsertSearchCriteria(
  criteria: Partial<SearchCriteria> & { id?: string }
): Promise<SearchCriteria> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('search_criteria')
    .upsert(
      { ...criteria, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error)
    throw new Error(`upsertSearchCriteria failed: ${error.message}`);

  return data as SearchCriteria;
}
