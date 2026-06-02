import { supabase } from '@/lib/supabase';

export const getResources = async (orgId: string) => {
  const { data, error } = await supabase
    .from('resources')
    .select('*, organization_id')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (error) throw error;
  return data;
};

// Alias for backward compatibility
export const getCommonAreas = getResources;
