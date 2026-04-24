import { supabase } from '@/lib/supabase';

export const getCommonAreas = async (orgId: string) => {
  const { data, error } = await supabase
    .from('common_areas')
    .select('*, organization_id')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (error) throw error;
  return data;
};
