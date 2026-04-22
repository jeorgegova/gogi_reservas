import { supabase } from '@/lib/supabase';

export interface Reservation {
  id: string;
  user_id: string;
  common_area_id: string;
  start_datetime: string;
  end_datetime: string;
  total_cost: number;
  status: 'pending_payment' | 'pending_validation' | 'approved' | 'rejected' | 'cancelled';
  organization_id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  common_areas?: { name: string };
  profiles?: { full_name: string };
  reservation_addons?: { addon_id: string; service_addons?: { name: string; additional_cost: number } }[];
}

export const getReservations = async (
  orgId: string,
  startDate: string,
  endDate: string
): Promise<Reservation[]> => {
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      user_id,
      common_area_id,
      start_datetime,
      end_datetime,
      total_cost,
      status,
      organization_id,
      common_areas:common_area_id (name)
    `)
    .eq('organization_id', orgId)
    .gte('start_datetime', startDate)
    .lte('start_datetime', endDate)
    .in('status', ['approved', 'pending_validation', 'pending_payment']);

  if (error) throw error;
  return data as any[];
};

export const getAvailability = async (
  areaId: string,
  start: string,
  end: string,
  excludeId?: string
): Promise<boolean> => {
  // Overlap logic: (start < newEnd AND end > newStart)
  let query = supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('common_area_id', areaId)
    .in('status', ['approved', 'pending_validation', 'pending_payment'])
    .lt('start_datetime', end)
    .gt('end_datetime', start);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;
  if (error) throw error;
  
  return (count || 0) === 0;
};

export const createReservation = async (reservation: Partial<Reservation>) => {
  // CRITICAL: Validation MUST be done against the DB, not cache
  const isAvailable = await getAvailability(
    reservation.common_area_id!,
    reservation.start_datetime!,
    reservation.end_datetime!
  );

  if (!isAvailable) {
    throw new Error('El horario seleccionado ya no está disponible (Conflicto de reserva)');
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateReservation = async (id: string, reservation: Partial<Reservation>) => {
  // Only validate availability if dates or area are changing
  if (reservation.start_datetime || reservation.end_datetime || reservation.common_area_id) {
    // We need to get current values if some are missing for validation
    const { data: current } = await supabase
      .from('reservations')
      .select('common_area_id, start_datetime, end_datetime')
      .eq('id', id)
      .single();

    const areaId = reservation.common_area_id || current?.common_area_id;
    const start = reservation.start_datetime || current?.start_datetime;
    const end = reservation.end_datetime || current?.end_datetime;

    const isAvailable = await getAvailability(areaId!, start!, end!, id);
    if (!isAvailable) {
      throw new Error('El nuevo horario seleccionado tiene un conflicto con otra reserva.');
    }
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(reservation)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};
