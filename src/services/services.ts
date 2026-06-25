import { supabase } from '@/lib/supabase';

export const getServices = async (orgId: string) => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', orgId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createService = async (orgId: string, payload: any) => {
  const { data, error } = await supabase
    .from('services')
    .insert({ organization_id: orgId, ...payload })
    .single();
  if (error) throw error;
  return data;
};

export const updateService = async (orgId: string, id: string, payload: any) => {
  const { error } = await supabase
    .from('services')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', orgId);
  if (error) throw error;
};

export const deleteService = async (orgId: string, id: string) => {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);
  if (error) throw error;
};
