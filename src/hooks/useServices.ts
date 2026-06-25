import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServices, createService, updateService, deleteService } from '@/services/services';

export const useServicesQuery = (orgId?: string) => {
  return useQuery({
    queryKey: ['services', orgId],
    queryFn: () => getServices(orgId!),
    enabled: !!orgId,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, payload }: { orgId: string; payload: any }) => createService(orgId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, id, payload }: { orgId: string; id: string; payload: any }) => updateService(orgId, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, id }: { orgId: string; id: string }) => deleteService(orgId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
};
