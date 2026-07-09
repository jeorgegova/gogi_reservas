import { supabase } from '@/lib/supabase';

export const getResources = async (orgId: string) => {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data;
};

export const createResource = async (orgId: string, payload: any) => {
  const { data, error } = await supabase
    .from('resources')
    .insert({ organization_id: orgId, ...payload })
    .single();
  if (error) throw error;
  return data;
};

export const updateResource = async (orgId: string, id: string, payload: any) => {
  const { error } = await supabase
    .from('resources')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', orgId);
  if (error) throw error;
};

export const deleteResource = async (orgId: string, id: string) => {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);
  if (error) throw error;
};
