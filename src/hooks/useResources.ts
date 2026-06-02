import { useQuery } from '@tanstack/react-query';
import { getResources } from '@/services/resources';

export const useResourcesQuery = (orgId?: string) => {
  return useQuery({
    queryKey: ['resources', orgId],
    queryFn: () => getResources(orgId!),
    enabled: !!orgId,
  });
};

// Alias para compatibilidad con imports antiguos
export const useCommonAreasQuery = useResourcesQuery;
