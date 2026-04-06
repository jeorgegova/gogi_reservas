import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reservationService from '@/services/reservations';

export const useReservationsQuery = (orgId: string | undefined, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['reservations', orgId, startDate, endDate],
    queryFn: () => reservationService.getReservations(orgId!, startDate, endDate),
    enabled: !!orgId && !!startDate && !!endDate,
    placeholderData: (previousData) => previousData, // keepPreviousData behavior in v5
  });
};

export const useCreateReservationMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reservationService.createReservation,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['reservations', variables.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['pendingReservations', variables.user_id, variables.organization_id] });
    },
  });
};

export const useUpdateReservationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<reservationService.Reservation> }) => 
      reservationService.updateReservation(id, data),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['reservations', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['pendingReservations', data.user_id, data.organization_id] });
    },
  });
};
