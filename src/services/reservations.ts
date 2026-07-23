import { supabase } from '@/lib/supabase';

export interface Reservation {
  id: string;
  user_id: string;
  resource_id: string;
  start_datetime: string;
  end_datetime: string;
  total_cost: number;
  status: 'pending_payment' | 'pending_validation' | 'approved' | 'rejected' | 'cancelled';
  organization_id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  resources?: { name: string };
  profiles?: { full_name: string; apartment?: string | null; email?: string };
  reservation_services?: { service_id: string; services?: { name: string; additional_cost: number } }[];
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
      resource_id,
      start_datetime,
      end_datetime,
      total_cost,
      status,
      organization_id,
      guest_name,
      guest_phone,
      resources:resource_id (name),
      profiles:user_id (full_name, apartment, email)
    `)
    .eq('organization_id', orgId)
    .gte('start_datetime', startDate)
    .lte('start_datetime', endDate)
    .in('status', ['approved', 'pending_validation', 'pending_payment']);

  if (error) throw error;
  return data as unknown as Reservation[];
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
    .eq('resource_id', areaId)
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

const getDayBounds = (dateValue: string) => {
  const [datePart] = dateValue.split('T');
  return {
    start: `${datePart}T00:00:00`,
    end: `${datePart}T23:59:59.999`,
  };
};

const validateDailyReservationLimit = async (reservation: Partial<Reservation>) => {
  if (!reservation.organization_id || !reservation.start_datetime) return;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('organization_id', reservation.organization_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.plan_id) return;

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('max_reservations_per_day')
    .eq('id', subscription.plan_id)
    .maybeSingle();

  const maxReservationsPerDay = plan?.max_reservations_per_day;
  if (maxReservationsPerDay === null || maxReservationsPerDay === undefined) return;

  const { start, end } = getDayBounds(reservation.start_datetime);
  const { count, error } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', reservation.organization_id)
    .gte('start_datetime', start)
    .lte('start_datetime', end)
    .not('status', 'in', '("cancelled","rejected")');

  if (error) throw error;
  if ((count || 0) >= maxReservationsPerDay) {
    throw new Error(`La organización alcanzó el límite de ${maxReservationsPerDay} reservas para el día seleccionado.`);
  }
};

export const createReservation = async (reservation: Partial<Reservation>) => {
  await validateDailyReservationLimit(reservation);

  // CRITICAL: Validation MUST be done against the DB, not cache
  const isAvailable = await getAvailability(
    reservation.resource_id!,
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
  if (reservation.start_datetime || reservation.end_datetime || reservation.resource_id) {
    // We need to get current values if some are missing for validation
    const { data: current } = await supabase
      .from('reservations')
      .select('resource_id, start_datetime, end_datetime')
      .eq('id', id)
      .single();

    const areaId = reservation.resource_id || current?.resource_id;
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
