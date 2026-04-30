import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useCommonAreasQuery } from '@/hooks/useCommonAreas';
import { useCreateReservationMutation, useUpdateReservationMutation } from '@/hooks/useReservations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as reservationService from '@/services/reservations';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn, detoxTime, formatTime } from '@/lib/utils';
import {
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Building2,
  Hammer,
  ClipboardCheck,
  Sun,
  Moon,
  Calendar,
  Users,
  Search,
  HelpCircle,
  Gift,
  Package,
  X,
  MapPin,
  Phone
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { format, addHours, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NewReservationPage() {
  const { profile, terminology, openAuthModal, businessType } = useAuth();
  const queryClient = useQueryClient();
  const { status: subscriptionStatus, daysUntilExpiry, loading: subscriptionLoading, previousSubscriptionExpiredBeyond20Days } = useSubscriptionStatus(profile?.organization_id);
  const navigate = useNavigate();
  const { id } = useParams();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const isFree = selectedArea?.is_free || false;
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(1);
  // Tipo de jornada seleccionada: 'diurna' | 'nocturna' | 'ambos' | null
  const [selectedJornada, setSelectedJornada] = useState<'diurna' | 'nocturna' | 'ambos' | null>(null);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);
  const [activeMaintenances, setActiveMaintenances] = useState<any[]>([]);

  // Para admins: seleccionar usuario para la reserva
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');

  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [bonusConfig, setBonusConfig] = useState<any>(null);
  const [userReservationCount, setUserReservationCount] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [showPromoModal, setShowPromoModal] = useState(false);

  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [operationSchedules, setOperationSchedules] = useState<any[]>([]);
  const [maxReservationDays, setMaxReservationDays] = useState<number | null>(null);

  // React Query Hooks
  const { data: areasData = [] } = useCommonAreasQuery(profile?.organization_id);
  const createMutation = useCreateReservationMutation();
  const updateMutation = useUpdateReservationMutation();

  const fallbackSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getNextBlockStart = (startTime: string): Date | null => {

    if (!startTime) return null;

    const start = parseISO(`${selectedDate} ${startTime}:00`);
    let earliestBlock: Date | null = null;

    // Check reservations
    for (const res of existingReservations) {
      const resStart = parseISO(detoxTime(res.start_datetime));
      if (resStart > start) {
        if (!earliestBlock || resStart < earliestBlock) {
          earliestBlock = resStart;
        }
      }
    }

    // Check maintenance
    for (const maint of activeMaintenances) {
      const maintStart = parseISO(detoxTime(maint.starts_at));
      if (maintStart > start) {
        if (!earliestBlock || maintStart < earliestBlock) {
          earliestBlock = maintStart;
        }
      }
    }

    return earliestBlock;
  };

  // Fetch pending reservations to prevent duplicates
  const targetUserIdForPendingCheck = (isAdmin && selectedUserId) ? selectedUserId : profile?.id;
  const isGuestUser = !profile?.id || profile?.role === 'guest';

  const { data: pendingReservations = [] } = useQuery({
    queryKey: ['pendingReservations', targetUserIdForPendingCheck, profile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('reservations')
        .select('id')
        .eq('user_id', targetUserIdForPendingCheck)
        .eq('organization_id', profile?.organization_id)
        .in('status', ['pending_payment', 'pending_validation']);

      if (isEditing && id) {
        query = query.neq('id', id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.organization_id && !!targetUserIdForPendingCheck,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const hasPendingReservation = pendingReservations.length > 0;

  // Fetch users for admin selection
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          user_id,
          phone,
          apartment,
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('organization_id', profile?.organization_id)
        .eq('role', 'user');

      if (error) throw error;

      // Transformar para mantener compatibilidad
      return (data || []).map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
        email: m.profiles.email,
        apartment: m.apartment
      })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    enabled: isAdmin && !!profile?.organization_id,
  });

  // Fetch single reservation for edit using useQuery
  const { data: reservationToEdit } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, common_areas(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!id,
  });
  
  // Fetch organization details for address and phone
  const { data: organization } = useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, address, phone, max_reservation_days_ahead')
        .eq('id', profile?.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  useEffect(() => {
    if (organization?.max_reservation_days_ahead) {
      setMaxReservationDays(organization.max_reservation_days_ahead);
    }
  }, [organization]);

  useEffect(() => {
    if (profile?.organization_id) {
      // Manual checks if needed
    }

    // Suscripción en tiempo real para actualizar el estado de reservas pendientes
    if (profile?.organization_id) {
      const channel = supabase
        .channel('reservation_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations',
            filter: `organization_id=eq.${profile.organization_id}`,
          },
          () => {
            // Invalidar el query de reservas pendientes para el usuario actual o seleccionado
            queryClient.invalidateQueries({
              queryKey: ['pendingReservations', targetUserIdForPendingCheck, profile.organization_id],
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.organization_id, targetUserIdForPendingCheck, queryClient]);

  useEffect(() => {
    if (reservationToEdit && isEditing) {
      // Logic from fetchReservationToEdit
      if (reservationToEdit.user_id !== profile?.id && !isAdmin) {
        // We'll handle this error below
        return;
      }
      if (reservationToEdit.status !== 'pending_validation' && !isAdmin) {
        // We'll handle this error below
        return;
      }

      if (reservationToEdit) {
        setSelectedArea(reservationToEdit.common_areas);
        const startDate = parseISO(detoxTime(reservationToEdit.start_datetime));
        const startDay = format(startDate, 'yyyy-MM-dd');
        setSelectedDate(startDay);
        setSelectedStartTime(format(startDate, 'HH:mm'));
        
        const endDate = parseISO(detoxTime(reservationToEdit.end_datetime));
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        setDuration(diffHours);
        
        setStep(2);
      }
    }
  }, [reservationToEdit, isEditing, profile?.id, isAdmin]);

  useEffect(() => {
    // Subscription status is handled by blockingError derivation
  }, [subscriptionStatus, daysUntilExpiry, subscriptionLoading, previousSubscriptionExpiredBeyond20Days]);

  const blockingError = (() => {
    if (!subscriptionLoading) {
      if (subscriptionStatus === 'cancelled') return 'Tu suscripción ha sido cancelada. Contacta al administrador para reactivar tu cuenta.';
      if (subscriptionStatus === 'inactive' || (subscriptionStatus === 'past_due' && daysUntilExpiry !== undefined && daysUntilExpiry < -20) || (subscriptionStatus === 'past_due' && previousSubscriptionExpiredBeyond20Days)) return 'Servicio temporalmente inhabilitado. Si tienes dudas por favor comunícate con administración.';
    }

    if (isEditing && reservationToEdit) {
      if (reservationToEdit.user_id !== profile?.id && !isAdmin) return `No tienes permiso para editar esta ${terminology.reservationLabel.toLowerCase()}.`;
      if (reservationToEdit.status !== 'pending_validation' && !isAdmin) return `La ${terminology.reservationLabel.toLowerCase()} ya se validó y no se puede editar.`;
    }

    if (!isAdmin && !isEditing && hasPendingReservation && !isGuestUser) {
      return `Tiene una ${terminology.reservationLabel.toLowerCase()} pendiente de pago o validación. Debe completar el pago o esperar aprobación antes de hacer una nueva ${terminology.reservationLabel.toLowerCase()}.`;
    }

    if (isGuestUser && isEditing) {
      return `Como invitado no puedes editar ${terminology.reservationLabel.toLowerCase()}s. Por favor inicia sesión para gestionar tus citas.`;
    }

    return null;
  })();

  // Lógica de ajuste automático de duración para no exceder la medianoche o la siguiente reserva
  useEffect(() => {
    if (selectedStartTime && selectedArea && selectedArea.pricing_type !== 'jornada') {
      const startHour = parseInt(selectedStartTime.split(':')[0]);
      const maxAllowedByDay = 24 - startHour;

      const nextBlock = getNextBlockStart(selectedStartTime);
      const start = parseISO(`${selectedDate} ${selectedStartTime}:00`);
      const addonDuration = getTotalAddonDuration();
      
      let maxAllowedHours = maxAllowedByDay;

      if (selectedArea.pricing_type === 'fixed') {
        const baseDuration = selectedArea.estimated_duration_minutes || 60;
        if (nextBlock && (baseDuration + addonDuration) > (nextBlock.getTime() - start.getTime()) / (1000 * 60)) {
            setSelectedStartTime('');
            setErrorMessage('La duración total con los servicios adicionales excede el tiempo disponible antes de la próxima reserva.');
            setIsErrorAlertOpen(true);
        }
      } else {
        const minRequiredMinutes = 60 + addonDuration;
        const availableMinutes = nextBlock ? (nextBlock.getTime() - start.getTime()) / (1000 * 60) : maxAllowedByDay * 60;

        if (minRequiredMinutes > availableMinutes) {
            setSelectedStartTime('');
            setErrorMessage('Los servicios adicionales seleccionados no caben en este horario. Por favor elige otro horario o quita servicios.');
            setIsErrorAlertOpen(true);
        } else if (duration > maxAllowedHours) {
            maxAllowedHours = maxAllowedHours >= 1 ? Math.floor(maxAllowedHours) : 1;
            setDuration(maxAllowedHours);
        }
      }
    }
  }, [selectedStartTime, selectedArea, duration, selectedAddons, existingReservations, activeMaintenances]);



  const filteredUsers = (users || []).filter((user: any) =>
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (terminology.unitLabel && user.apartment?.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const fetchBusySlots = async (areaId: string) => {
    const isSharedCalendar = businessType !== 'residential';
    let areaIds: string[] = [areaId];

    if (isSharedCalendar) {
      const { data: allAreas } = await supabase
        .from('common_areas')
        .select('id')
        .eq('organization_id', profile?.organization_id)
        .eq('is_active', true);
      if (allAreas && allAreas.length > 0) {
        areaIds = allAreas.map((a: any) => a.id);
      }
    }

    let query = supabase
      .from('reservations')
      .select('start_datetime, end_datetime, common_area_id, profiles:user_id(full_name, phone), common_areas(name)')
      .in('common_area_id', areaIds)
      .eq('organization_id', profile?.organization_id)
      .in('status', ['approved', 'pending_validation', 'pending_payment']);

    if (isEditing && id) {
      query = query.neq('id', id);
    }

    const { data: resData } = await query;
    setExistingReservations(resData || []);

    const { data: maintData } = await supabase
      .from('maintenance_notices')
      .select('starts_at, ends_at, severity, title, content')
      .or(`common_area_id.eq.${areaId},common_area_id.is.null`)
      .eq('organization_id', profile?.organization_id)
      .eq('is_active', true);

    setActiveMaintenances(maintData || []);
  };

  const handleAreaSelect = (area: any) => {
    if (isAdmin && !selectedUserId) {
      setUserError('Por favor selecciona un usuario antes de elegir un área.');
      return;
    }

    setUserError(null);
    setSelectedArea(area);
    setSelectedJornada(null);
    setSelectedAddons([]);
    fetchBusySlots(area.id);
    fetchBonusInfo(area.id);
    fetchAddons(area.id);
    fetchOperationSchedules();

    if (isGuestUser) {
      setShowPromoModal(true);
    } else {
      setStep(2);
    }
  };

  const fetchBonusInfo = async (areaId: string) => {
    if (!profile?.id || isGuestUser) {
      setBonusConfig(null);
      setUserReservationCount(0);
      return;
    }

    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('bonus_system_active')
        .eq('id', profile?.organization_id)
        .single();

      if (!org?.bonus_system_active) {
        setBonusConfig(null);
        return;
      }

      const { data: config } = await supabase
        .from('bonus_configs')
        .select('*')
        .eq('common_area_id', areaId)
        .eq('is_active', true)
        .single();

      setBonusConfig(config);

      if (config) {
        const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : profile.id;
        const { count } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', targetUserId)
          .eq('common_area_id', areaId)
          .eq('status', 'approved');

        setUserReservationCount(count || 0);
      } else {
        setUserReservationCount(0);
      }
    } catch (error) {
      console.error('Error fetching bonus info:', error);
      setBonusConfig(null);
      setUserReservationCount(0);
    }
  };

  const fetchAddons = async (areaId: string) => {
    const { data } = await supabase
      .from('common_area_addons')
      .select('*, service_addons(*)')
      .eq('common_area_id', areaId);
    if (data) {
      const mapped = data
        .filter((row: any) => row.service_addons?.is_active)
        .map((row: any) => ({
          id: row.addon_id,
          name: row.service_addons?.name || '',
          description: row.service_addons?.description || '',
          additional_cost: row.custom_price ?? row.service_addons?.base_cost ?? 0,
          additional_duration_minutes: row.service_addons?.duration_minutes || 0,
        }));
      setAvailableAddons(mapped);
    } else {
      setAvailableAddons([]);
    }
    setSelectedAddons([]);
  };

  const fetchOperationSchedules = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('operation_schedules')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true);
    setOperationSchedules(data || []);
  };

  useEffect(() => {
    if (isEditing && reservationToEdit?.common_areas?.id && selectedArea?.id === reservationToEdit.common_areas.id) {
      fetchBusySlots(reservationToEdit.common_areas.id);
      fetchOperationSchedules();
      fetchBonusInfo(reservationToEdit.common_areas.id);
      fetchAddons(reservationToEdit.common_areas.id);
    }
  }, [isEditing, selectedArea?.id]);

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => {
      const exists = prev.find((a: any) => a.id === addon.id);
      if (exists) return prev.filter((a: any) => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const getTotalAddonCost = () => selectedAddons.reduce((sum: number, a: any) => sum + (a.additional_cost || 0), 0);
  const getTotalAddonDuration = () => selectedAddons.reduce((sum: number, a: any) => sum + (a.additional_duration_minutes || 0), 0);

  const getTotalServiceDurationMinutes = () => {
    if (!selectedArea) return 60;
    const base = selectedArea.estimated_duration_minutes || 60;
    return base + getTotalAddonDuration();
  };

  const getOperationHoursForDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    const dow = date.getDay();
    const schedule = operationSchedules.find(s => s.day_of_week === dow);
    if (!schedule) return null;
    return { start: schedule.start_time, end: schedule.end_time };
  };

  const baseTimeSlots = (() => {
    const hours = getOperationHoursForDate(selectedDate);
    if (hours) {
      const startH = parseInt(hours.start.split(':')[0]);
      const startM = parseInt(hours.start.split(':')[1] || '0');
      const endH = parseInt(hours.end.split(':')[0]);
      const endM = parseInt(hours.end.split(':')[1] || '0');
      const endTotalMin = endH * 60 + endM;
      const slots: string[] = [];
      let current = startH * 60 + startM;
      while (current < endTotalMin) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        current += 30;
      }
      if (slots.length === 0) return fallbackSlots;
      return slots;
    }
    return fallbackSlots;
  })();

  const isDateWithinOperationSchedule = (dateStr: string) => {
    if (operationSchedules.length === 0) return true;
    return !!getOperationHoursForDate(dateStr);
  };

  const getBreakForDate = (dateStr: string): { start: number; end: number } | null => {
    const date = parseISO(dateStr);
    const dow = date.getDay();
    const schedule = operationSchedules.find(s => s.day_of_week === dow);
    if (!schedule?.break_start || !schedule?.break_end) return null;
    const [bsh, bsm] = schedule.break_start.split(':').map(Number);
    const [beh, bem] = schedule.break_end.split(':').map(Number);
    return { start: bsh * 60 + bsm, end: beh * 60 + bem };
  };

  const getFixedTimeSlots = (): string[] => {
    const hours = getOperationHoursForDate(selectedDate);
    if (!hours) return [];
    const startH = parseInt(hours.start.split(':')[0]);
    const startM = parseInt(hours.start.split(':')[1] || '0');
    const endH = parseInt(hours.end.split(':')[0]);
    const endM = parseInt(hours.end.split(':')[1] || '0');
    const endTotalMin = endH * 60 + endM;
    const brk = getBreakForDate(selectedDate);
    const slots: string[] = [];
    const totalDuration = getTotalServiceDurationMinutes();
    let current = startH * 60 + startM;
    while (current + totalDuration <= endTotalMin) {
      const slotEnd = current + totalDuration;
      const overlapsBreak = brk && (current < brk.end && slotEnd > brk.start);
      if (!overlapsBreak) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
      current += 30;
    }
    return slots;
  };



  // Recalcular el descuento aplicado (ciclo de requeridas + 1)
  useEffect(() => {
    if (bonusConfig) {
      const cycleLength = bonusConfig.reservations_required + 1;
      const progressInCycle = userReservationCount % cycleLength;

      const isEligible = progressInCycle === bonusConfig.reservations_required;
      if (isEligible) {
        setAppliedDiscount(bonusConfig.discount_percentage);
      } else {
        setAppliedDiscount(0);
      }
    } else {
      setAppliedDiscount(0);
    }
  }, [bonusConfig, userReservationCount]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setJornadaError(null);
    if (selectedArea) {
      fetchBusySlots(selectedArea.id);
    }
  };





  const getSlotStatus = (time: string) => {
    const slotStart = parseISO(`${selectedDate}T${time}:00`);

    if (slotStart < new Date()) {
      return { status: 'past' as const };
    }

    let slotEnd: Date;

    if (selectedArea?.pricing_type === 'fixed') {
      const totalMinutes = getTotalServiceDurationMinutes();
      slotEnd = new Date(slotStart.getTime() + totalMinutes * 60 * 1000);
    } else {
      const totalMinutes = duration * 60 + getTotalAddonDuration();
      slotEnd = new Date(slotStart.getTime() + totalMinutes * 60 * 1000);
    }

    const isSharedCalendar = businessType !== 'residential';
    const isReserved = existingReservations.some(res => {
      if (!isSharedCalendar && res.common_area_id !== selectedArea?.id) return false;
      const resStart = parseISO(detoxTime(res.start_datetime));
      const resEnd = parseISO(detoxTime(res.end_datetime));
      return (slotStart < resEnd && slotEnd > resStart);
    });

    if (isReserved) {
      const conflicts = existingReservations.filter(res => {
        if (!isSharedCalendar && res.common_area_id !== selectedArea?.id) return false;
        const resStart = parseISO(detoxTime(res.start_datetime));
        const resEnd = parseISO(detoxTime(res.end_datetime));
        return (slotStart < resEnd && slotEnd > resStart);
      });
      return {
        status: 'reserved' as const,
        conflicts: conflicts.map((c: any) => ({
          userName: c.profiles?.full_name || 'Usuario',
          userPhone: c.profiles?.phone || '',
          areaName: c.common_areas?.name || '',
          start: c.start_datetime,
          end: c.end_datetime,
        }))
      };
    }

    const brk = getBreakForDate(selectedDate);
    if (brk) {
      const slotStartMin = slotStart.getHours() * 60 + slotStart.getMinutes();
      const slotEndMin = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      if (slotStartMin < brk.end && slotEndMin > brk.start) {
        return { status: 'break' as const };
      }
    }

    const maintenance = activeMaintenances.find(maint => {
      const maintStart = parseISO(detoxTime(maint.starts_at));
      const maintEnd = parseISO(detoxTime(maint.ends_at));
      return (slotStart < maintEnd && slotEnd > maintStart);
    });

    if (maintenance) return { status: 'maintenance', reason: maintenance.title };

    return { status: 'available' };
  };

  // Calcular el costo total según el tipo de precio
  const calculateTotalCost = () => {
    if (isFree) return 0;

    if (!selectedArea) return 0;

    let finalBaseCost = 0;
    if (selectedArea.pricing_type === 'fixed') {
      finalBaseCost = selectedArea.fixed_cost || 0;
    } else if (selectedArea.pricing_type === 'jornada') {
      if (selectedJornada === 'diurna') finalBaseCost = selectedArea.cost_jornada_diurna || 0;
      else if (selectedJornada === 'nocturna') finalBaseCost = selectedArea.cost_jornada_nocturna || 0;
      else if (selectedJornada === 'ambos') finalBaseCost = selectedArea.cost_jornada_ambos || 0;
    } else {
      finalBaseCost = selectedArea.cost_per_hour * duration;
    }

    const addonCost = getTotalAddonCost();
    const totalBeforeDiscount = finalBaseCost + addonCost;

    if (appliedDiscount > 0) {
      return totalBeforeDiscount * (1 - appliedDiscount / 100);
    }

    return totalBeforeDiscount;
  };

  // Obtener la hora de fin de la jornada según la configuración del área
  const getJornadaEndTime = () => {
    if (!selectedArea) return '';
    if (selectedJornada === 'diurna') return selectedArea.jornada_end_diurna || '18:00';
    if (selectedJornada === 'nocturna') return selectedArea.jornada_end_nocturna || '23:59';
    if (selectedJornada === 'ambos') return selectedArea.jornada_end_nocturna || '23:59';
    return '';
  };

  // Determinar la hora de fin según el tipo de precio
  const getEndTime = () => {
    if (!selectedArea || !selectedStartTime) return '';

    if (selectedArea.pricing_type === 'fixed') {
      const totalMinutes = getTotalServiceDurationMinutes();
      const startDate = parseISO(`${selectedDate} ${selectedStartTime}:00`);
      return format(new Date(startDate.getTime() + totalMinutes * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss");
    }

    if (selectedArea.pricing_type === 'jornada') {
      const endTime = getJornadaEndTime();
      return format(parseISO(`${selectedDate}T${endTime}:00`), "yyyy-MM-dd'T'HH:mm:ss");
    }
    return format(addHours(parseISO(`${selectedDate}T${selectedStartTime}:00`), duration), "yyyy-MM-dd'T'HH:mm:ss");
  };

  // Obtener el texto del horario para mostrar
  const getJornadaScheduleText = () => {
    if (!selectedArea) return '';
    if (selectedJornada === 'diurna') return `Diurna (${formatTime(selectedArea.jornada_start_diurna || '08:00')} - ${formatTime(selectedArea.jornada_end_diurna || '18:00')})`;
    if (selectedJornada === 'nocturna') return `Nocturna (${formatTime(selectedArea.jornada_start_nocturna || '18:00')} - ${formatTime(selectedArea.jornada_end_nocturna || '23:59')})`;
    if (selectedJornada === 'ambos') return `Completo (${formatTime(selectedArea.jornada_start_diurna || '08:00')} - ${formatTime(selectedArea.jornada_end_nocturna || '23:59')})`;
    return '';
  };

  // Verificar si la jornada está disponible para la fecha seleccionada
  const checkJornadaAvailability = () => {
    if (!selectedArea || !selectedJornada || !selectedDate) return { available: true };

    const jornadaStart = selectedJornada === 'diurna'
      ? selectedArea.jornada_start_diurna || '08:00'
      : selectedJornada === 'nocturna'
        ? selectedArea.jornada_start_nocturna || '18:00'
        : selectedArea.jornada_start_diurna || '08:00';

    const jornadaEnd = selectedJornada === 'diurna'
      ? selectedArea.jornada_end_diurna || '18:00'
      : selectedJornada === 'nocturna'
        ? selectedArea.jornada_end_nocturna || '23:59'
        : selectedArea.jornada_end_nocturna || '23:59';

    const proposedStart = parseISO(`${selectedDate}T${jornadaStart}:00`);
    const proposedEnd = parseISO(`${selectedDate}T${jornadaEnd}:00`);

    // Verificar si hay conflicto con reservas existentes
    const conflict = existingReservations.some(res => {
      const resStart = parseISO(detoxTime(res.start_datetime));
      const resEnd = parseISO(detoxTime(res.end_datetime));
      return (proposedStart < resEnd && proposedEnd > resStart);
    });

    if (conflict) {
      return { available: false, message: `Ya existe una ${terminology.reservationLabel.toLowerCase()} para esta jornada en la fecha seleccionada` };
    }

    // Verificar si hay conflicto con mantenimiento
    const maintenanceConflict = activeMaintenances.find(maint => {
      const maintStart = parseISO(detoxTime(maint.starts_at));
      const maintEnd = parseISO(detoxTime(maint.ends_at));
      return (proposedStart < maintEnd && proposedEnd > maintStart);
    });

    if (maintenanceConflict) {
      return { available: false, message: `El área tiene un aviso: ${maintenanceConflict.title}` };
    }

    return { available: true };
  };

  const [jornadaError, setJornadaError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(initialDate ? parseISO(initialDate) : new Date());
  const [daysWithReservations, setDaysWithReservations] = useState<Set<string>>(new Set());

  // Fetch reservations for the current month to show availability on calendar
  useEffect(() => {
    if (selectedArea) {
      fetchMonthReservations();
    }
  }, [selectedArea, currentMonth]);

  // Close promo modal on Escape
  useEffect(() => {
    if (!showPromoModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPromoModal(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPromoModal]);

  const fetchMonthReservations = async () => {
    if (!selectedArea) return;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data } = await supabase
      .from('reservations')
      .select('start_datetime, end_datetime')
      .eq('common_area_id', selectedArea.id)
      .eq('organization_id', profile?.organization_id)
      .in('status', ['approved', 'pending_validation', 'pending_payment'])
      .lt('start_datetime', monthEnd.toISOString())
      .gt('end_datetime', monthStart.toISOString());

    if (data) {
      const days = new Set<string>();
      data.forEach(res => {
        const start = parseISO(detoxTime(res.start_datetime));
        const end = parseISO(detoxTime(res.end_datetime));
        const daySlots = eachDayOfInterval({ start, end });
        daySlots.forEach(day => {
          days.add(format(day, 'yyyy-MM-dd'));
        });
      });
      setDaysWithReservations(days);
    }
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  const handleReserve = async () => {
    if (!profile || !selectedArea || !selectedStartTime) return;

    // Para áreas por jornada, validar selección
    if (selectedArea.pricing_type === 'jornada' && !selectedJornada) {
      setErrorMessage('Por favor selecciona una jornada (diurna, nocturna o completo)');
      setIsErrorAlertOpen(true);
      return;
    }

    // Validar datos de contacto para invitados
    if (isGuestUser && (!guestName || !guestPhone)) {
      setErrorMessage('Por favor ingresa tu nombre y teléfono de contacto');
      setIsErrorAlertOpen(true);
      return;
    }

    // Validar si el invitado ya tiene una reserva pendiente por su teléfono
    if (isGuestUser && guestPhone) {
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('guest_phone', guestPhone)
        .in('status', ['pending_payment', 'pending_validation']);

      if (count && count > 0) {
        setErrorMessage(`Ya existe una ${terminology.reservationLabel.toLowerCase()} pendiente de validación asociada al teléfono ${guestPhone}. Por favor, espera a que sea procesada por la administración.`);
        setIsErrorAlertOpen(true);
        return;
      }
    }

    // Limpiar errores anteriores
    setErrorMessage('');

    // Verificación final de disponibilidad (doble check local antes de enviar)
    if (selectedStartTime && selectedArea.pricing_type !== 'jornada') {
      const info = getSlotStatus(selectedStartTime);
      if (info.status !== 'available') {
        setErrorMessage(`El horario seleccionado ya no está disponible${info.reason ? `: ${info.reason}` : ''}. Por favor selecciona otro.`);
        setIsErrorAlertOpen(true);
        return;
      }
    }

    const start = `${selectedDate}T${selectedStartTime}:00`;
    const end = getEndTime();
    const totalCost = calculateTotalCost();

    if (isAdmin && (!selectedUserId || selectedUserId.length === 0)) {
      setErrorMessage(`Por favor selecciona un ${terminology.userLabel.toLowerCase()} para la ${terminology.reservationLabel.toLowerCase()}`);
      setIsErrorAlertOpen(true);
      return;
    }

    const reservationUserId = (isAdmin && selectedUserId && selectedUserId.length > 0) ? selectedUserId : profile.id;
    const reservationStatus = 'pending_validation';

    const reservationData: Partial<reservationService.Reservation> = {
      user_id: reservationUserId,
      common_area_id: selectedArea.id,
      start_datetime: start,
      end_datetime: end,
      total_cost: totalCost,
      organization_id: profile?.organization_id,
      status: reservationStatus,
      guest_name: isGuestUser ? guestName : null,
      guest_phone: isGuestUser ? guestPhone : null
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: reservationData });
      } else {
        const result = await createMutation.mutateAsync(reservationData);

        if (selectedAddons.length > 0 && result?.id) {
          try {
            const addonInserts = selectedAddons.map((addon: any) => ({
              reservation_id: result.id,
              addon_id: addon.id,
              charged_price: addon.additional_cost || 0,
            }));
            await supabase.from('reservation_addons').insert(addonInserts);
          } catch (addonError) {
            console.error('Error saving reservation add-ons:', addonError);
          }
        }

        // Ya no se requiere redirección a Wompi para reservas
        /*
        if (!isFree && result?.id) {
          navigate(`/payment/${result.id}`);
          return;
        }
        */
      }

      // Si el área es gratuita o no devolvió ID de pago, ir al inicio
      const targetPath = isGuestUser
        ? `/${profile?.organization_slug}`
        : (isAdmin ? '/admin/reservations' : '/reservations/my');

      navigate(targetPath);
    } catch (error: any) {
      setErrorMessage(error.message || `Error al procesar la ${terminology.reservationLabel.toLowerCase()}`);
      setIsErrorAlertOpen(true);
    }
  };

  if (blockingError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-none shadow-sm bg-white text-center p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <HelpCircle className="w-12 h-12" />
            </div>
          </div>
          <CardTitle className="text-xl mb-4">¡Oops! Servicio temporalmente inhabilitado</CardTitle>
          <CardDescription className="text-base mb-6">
            {blockingError}
          </CardDescription>
          <Button onClick={() => navigate('/reservations/my')}>
            Ver mis {terminology.reservationLabel.toLowerCase()}s
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEditing ? `Editar ${terminology.reservationLabel}` : `Nueva ${terminology.reservationLabel}`}
          </h1>

          <p className="text-gray-500 text-sm">Sigue los pasos para asegurar tu espacio.</p>
          
          {organization && (organization.address || organization.phone) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
              {organization.address && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(organization.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-primary transition-all duration-300 group"
                  title="Ver en Google Maps"
                >
                  <div className="p-1 bg-gray-100 rounded-md group-hover:bg-primary/10 transition-colors">
                    <MapPin className="w-3 h-3 text-gray-400 group-hover:text-primary" />
                  </div>
                  <span className="truncate max-w-[200px] sm:max-w-none">{organization.address}</span>
                </a>
              )}
              {organization.phone && (
                <a 
                  href={`tel:${organization.phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-primary transition-all duration-300 group"
                  title="Llamar ahora"
                >
                  <div className="p-1 bg-gray-100 rounded-md group-hover:bg-primary/10 transition-colors">
                    <Phone className="w-3 h-3 text-gray-400 group-hover:text-primary" />
                  </div>
                  <span>{organization.phone}</span>
                </a>
              )}
            </div>
          )}
        </div>
        <div className="w-full">
          {/* Barra de progreso */}
          <div className="flex items-center gap-2 mb-4">
            {/* Paso 1 */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                step === 1 ? "bg-primary text-white" : step > 1 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {step > 1 ? "✓" : "1"}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors duration-300",
                step >= 1 ? "text-gray-900" : "text-gray-400"
              )}>Seleccionar {terminology.areaLabel.toLowerCase()}</span>
            </div>

            {/* Línea conectora */}
            <div className={cn(
              "flex-1 h-0.5 mx-2 transition-colors duration-300",
              step > 1 ? "bg-emerald-500" : "bg-gray-200"
            )} />

            {/* Paso 2 */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                step === 2 ? "bg-primary text-white" : step > 2 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {step > 2 ? "✓" : "2"}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors duration-300",
                step >= 2 ? "text-gray-900" : "text-gray-400"
              )}>Configurar</span>
            </div>

            {/* Línea conectora */}
            <div className={cn(
              "flex-1 h-0.5 mx-2 transition-colors duration-300",
              step > 2 ? "bg-emerald-500" : "bg-gray-200"
            )} />

            {/* Paso 3 */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                step === 3 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              )}>
                3
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors duration-300",
                step >= 3 ? "text-gray-900" : "text-gray-400"
              )}>Pagar</span>
            </div>
          </div>
        </div>
      </div>

      {step === 1 && (
        <>
          {/* Selector de usuario para admin */}
          {isAdmin && (
            usersLoading ? (
              <div className="mb-6 p-8 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center gap-3 animate-pulse">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-500">Cargando {terminology.userLabel.toLowerCase()}s...</p>
              </div>
            ) : users.length > 0 ? (
              <Card className="mb-4 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg font-bold text-gray-900">Reservar para {terminology.userLabel}</CardTitle>
                  </div>
                  <CardDescription>Selecciona el {terminology.userLabel.toLowerCase()} que hará uso del {terminology.areaLabel.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {users.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder={`Buscar por nombre, email o ${terminology.unitLabel.toLowerCase()}...`}
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                  )}
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setUserError(null); // Clear error when selecting
                    }}
                    className={cn(
                      "w-full p-3 border rounded-lg bg-white text-gray-900 transition-colors",
                      selectedUserId ? "border-green-200 bg-green-50/50" : "border-gray-200"
                    )}
                  >
                    <option value="">Seleccionar {terminology.userLabel.toLowerCase()}</option>
                    {filteredUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} {user.apartment ? `- ${terminology.unitLabel} ${user.apartment}` : ''}
                      </option>
                    ))}
                  </select>
                  {userError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {userError}
                    </div>
                  )}
                  {selectedUserId && (
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">
                            Usuario seleccionado: {(users as any[]).find(u => u.id === selectedUserId)?.full_name || (users as any[]).find(u => u.id === selectedUserId)?.email}
                            {(users as any[]).find(u => u.id === selectedUserId)?.apartment && ` - Apt ${(users as any[]).find(u => u.id === selectedUserId)?.apartment}`}
                          </span>
                        </div>
                      </div>
                      {hasPendingReservation && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-700 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">¡Atención! Este {terminology.userLabel.toLowerCase()} ya tiene una {terminology.reservationLabel.toLowerCase()} pendiente.</p>
                            <p>Debe completar el pago o esperar validación antes de crear una nueva.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 tracking-tight">Esta organización no tiene {terminology.userLabel.toLowerCase()}s para crear {terminology.reservationLabel.toLowerCase()}s</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Debe registrar {terminology.userLabel.toLowerCase()}s en el módulo de {terminology.userLabel.toLowerCase()}s antes de poder realizar {terminology.reservationLabel.toLowerCase()}s administrativas.
                  </p>
                </div>
              </div>
            )
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areasData.map((area: any) => (
              <Card
                key={area.id}
                className={cn(
                  "border-none apple-shadow bg-white rounded-2xl transition-all overflow-hidden",
                  (isAdmin && !usersLoading && users.length === 0) ? "opacity-75 cursor-not-allowed" : "hover:apple-shadow-hover hover:-translate-y-1 cursor-pointer"
                )}
                onClick={() => (isAdmin && !usersLoading && users.length === 0) ? null : handleAreaSelect(area)}
              >
                <div className="relative h-48 overflow-hidden">
                  {area.image_url ? (
                    <img src={area.image_url} alt={area.name} className="w-full h-full object-contain bg-white" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-primary px-3 py-1 rounded-full text-xs font-bold text-white">
                    {area.is_free
                      ? 'Gratuito'
                      : area.pricing_type === 'fixed'
                        ? formatCurrency(area.fixed_cost)
                        : area.pricing_type === 'jornada'
                          ? 'Por Jornada'
                          : `${formatCurrency(area.cost_per_hour)}/h`}
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg font-bold text-gray-900">{area.name}</CardTitle>
                  <CardDescription className="text-gray-500 text-sm line-clamp-2 mt-1">
                    {area.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    {area.pricing_type === 'fixed' ? (
                      <>
                        <Clock className="w-3 h-3 text-[#FF3B30]" />
                        <span>{area.estimated_duration_minutes || 60} min</span>
                      </>
                    ) : area.pricing_type === 'jornada' ? (
                      <>
                        <Calendar className="w-3 h-3" />
                        <span>Jornada Completa</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-[#FF3B30]" />
                        <span>Máx. {area.max_hours_per_reservation}h por {terminology.reservationLabel.toLowerCase()}</span>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-2">
                  <Button
                    className="w-full !bg-[#1e293b] !hover:bg-[#0f172a] text-white font-bold h-11 rounded-xl shadow-lg shadow-slate-800/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none"
                    style={{ backgroundColor: '#1e293b' }}
                    disabled={isAdmin && users.length === 0}
                  >
                    Seleccionar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 2 && selectedArea && (
        <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-gray-50">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100" onClick={() => setStep(1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <CardTitle className="text-xl font-bold">{selectedArea.name}</CardTitle>
              <CardDescription>
                Configura tu horario
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Action Block Component to avoid duplication of logic */}
            {(() => {
              const actionBlock = (
                <div className="space-y-4">
                  {!isFree && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative overflow-hidden">
                      {appliedDiscount > 0 && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg animate-pulse z-10">
                          {appliedDiscount}% BONIF.
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {selectedArea.pricing_type === 'fixed' || selectedArea.pricing_type === 'jornada' ? (
                            <Calendar className="w-4 h-4 text-primary" />
                          ) : (
                            <Clock className="w-4 h-4 text-[#FF3B30]" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Inversión total</p>
                          <div className="flex items-baseline gap-2">
                            {appliedDiscount > 0 && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(calculateTotalCost() / (1 - appliedDiscount / 100))}
                              </span>
                            )}
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                              {formatCurrency(calculateTotalCost())}
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedAddons.length > 0 && (
                        <div className="mb-3 pt-2 border-t border-gray-200">
                          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Desglose:</p>
                          <p className="text-[10px] text-gray-600">
                            {selectedArea.pricing_type === 'fixed'
                              ? `${terminology.areaLabel}: ${formatCurrency(selectedArea.fixed_cost || 0)}`
                              : selectedArea.pricing_type === 'jornada'
                                ? `${terminology.areaLabel}: ${formatCurrency(selectedJornada === 'diurna' ? selectedArea.cost_jornada_diurna : selectedJornada === 'nocturna' ? selectedArea.cost_jornada_nocturna : selectedArea.cost_jornada_ambos)}`
                                : `${duration}h × ${formatCurrency(selectedArea.cost_per_hour)} = ${formatCurrency(selectedArea.cost_per_hour * duration)}`
                          }
                          </p>
                          {selectedAddons.map((addon: any) => {
                            const aHours = Math.floor(addon.additional_duration_minutes / 60);
                            const aMins = addon.additional_duration_minutes % 60;
                            const aDurLabel = aHours > 0 ? (aMins > 0 ? `${aHours}h ${aMins}min` : `${aHours}h`) : `${aMins} min`;
                            return (
                              <p key={addon.id} className="text-[10px] text-gray-500">
                                + {addon.name}: {formatCurrency(addon.additional_cost)} ({aDurLabel})
                              </p>
                            );
                          })}
                        </div>
                      )}
                      {bonusConfig && appliedDiscount === 0 && (
                        <div className="mb-3 text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-1.5">
                          <Gift className="w-3 h-3" />
                          {userReservationCount % (bonusConfig.reservations_required + 1)}/{bonusConfig.reservations_required} reservas para bonif.
                        </div>
                      )}
                      <Button
                        size="lg"
                        className="w-full !bg-[#1e293b] text-white rounded-xl apple-shadow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none h-12 text-sm font-bold"
                        style={{ backgroundColor: '#1e293b' }}
                        disabled={
                          !selectedDate ||
                          !selectedStartTime ||
                          (selectedArea.pricing_type === 'jornada' && !selectedJornada)
                        }
                        onClick={() => {
                          if (selectedArea.pricing_type === 'jornada') {
                            const availability = checkJornadaAvailability();
                            if (!availability.available) {
                              setJornadaError(availability.message || 'Horario no disponible');
                              return;
                            }
                            setJornadaError(null);
                          }
                          setStep(3);
                        }}
                      >
                        Continuar {terminology.reservationLabel.toLowerCase()} <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {isFree && (
                    <Button
                      size="lg"
                      className="w-full !bg-[#1e293b] text-white rounded-xl apple-shadow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none h-12 text-sm font-bold"
                      style={{ backgroundColor: '#1e293b' }}
                      disabled={!selectedDate || !selectedStartTime}
                      onClick={() => {
                        setStep(3);
                      }}
                    >
                      Continuar {terminology.reservationLabel.toLowerCase()} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              );

              return (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Calendario, Duración e Inversión (Desktop) */}
                  <div className="flex flex-col space-y-4">
                    <div className="space-y-2">
                  {/* Mini Calendar */}
                  <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                        <div key={i} className="text-[10px] font-medium text-gray-400 uppercase">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {getDaysInMonth().map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const hasReservation = daysWithReservations.has(dateStr);
                        const isSelected = dateStr === selectedDate;
                        const isPast = day < new Date() && !isToday(day);
                        const notInSchedule = !isDateWithinOperationSchedule(dateStr);
                        const isBeyondLimit = maxReservationDays
                          ? day > new Date(new Date().getTime() + maxReservationDays * 24 * 60 * 60 * 1000)
                          : false;

                        return (
                          <button
                            key={dateStr}
                            disabled={isPast || notInSchedule || isBeyondLimit}
                            onClick={() => handleDateChange(dateStr)}
                            className={cn(
                              "w-7 h-7 text-xs rounded-full flex items-center justify-center transition-colors",
                              isSelected && "bg-primary text-white shadow-md shadow-primary/20",
                              !isSelected && !isPast && !notInSchedule && !isBeyondLimit && "hover:bg-gray-100",
                              (isPast || notInSchedule || isBeyondLimit) && "text-gray-300 cursor-not-allowed",
                              hasReservation && !isSelected && !isPast && "bg-amber-100 text-amber-700",
                              isToday(day) && !isSelected && "ring-1 ring-primary ring-inset text-primary"
                            )}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex gap-3 text-[10px] text-gray-500 justify-center">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-100 rounded" />
                        <span>Con reservas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-100 rounded" />
                        <span>Disponible</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* For fixed-price (commercial): no duration/jornada selector needed */}
                {selectedArea.pricing_type !== 'fixed' && (
                  <div className="space-y-2">
                    {selectedArea.pricing_type === 'jornada' ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {selectedJornada
                                ? `Jornada seleccionada: ${selectedJornada === 'diurna' ? 'Diurna' : selectedJornada === 'nocturna' ? 'Nocturna' : 'Completo'}`
                                : 'Selecciona una jornada disponible'
                              }
                            </p>
                            {selectedJornada && (
                              <p className="text-lg font-bold text-primary">
                                {selectedJornada === 'diurna' && `${formatTime(selectedArea.jornada_start_diurna || '08:00')} - ${formatTime(selectedArea.jornada_end_diurna || '18:00')}`}
                                {selectedJornada === 'nocturna' && `${formatTime(selectedArea.jornada_start_nocturna || '18:00')} - ${formatTime(selectedArea.jornada_end_nocturna || '23:59')}`}
                                {selectedJornada === 'ambos' && `${formatTime(selectedArea.jornada_start_diurna || '08:00')} - ${formatTime(selectedArea.jornada_end_nocturna || '23:59')}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Label className="text-sm font-semibold text-gray-700">Duración (horas)</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].filter(h => {
                            const maxByArea = selectedArea.max_hours_per_reservation;
                            if (h > maxByArea) return false;
                            if (selectedStartTime) {
                              const startHour = parseInt(selectedStartTime.split(':')[0]);
                              if (startHour + h > 24) return false;

                              const nextBlock = getNextBlockStart(selectedStartTime) as Date | null;
                              if (nextBlock) {
                                const start = parseISO(`${selectedDate}T${selectedStartTime}:00`);
                                const diffHours = (nextBlock.getTime() - start.getTime()) / (1000 * 60 * 60);
                                return h <= diffHours;
                              }
                            }
                            return true;
                          }).map(h => (
                            <Button
                              key={h}
                              variant={duration === h ? "default" : "outline"}
                              className={cn(
                                "flex-1 h-11 transition-all duration-300 rounded-xl",
                                duration === h ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" : "border-gray-200"
                              )}
                              onClick={() => setDuration(h)}
                            >
                              {h}h
                            </Button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedArea.pricing_type === 'fixed' && (
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Clock className="w-4 h-4 text-[#FF3B30]" />
                      <span>Duración del servicio: {getTotalServiceDurationMinutes()} minutos</span>
                    </div>
                    {(() => {
                      const hours = getOperationHoursForDate(selectedDate);
                      return hours ? (
                        <div className="text-xs text-gray-500 mt-1">
                          Horario de atención: {formatTime(hours.start)} - {formatTime(hours.end)}
                        </div>
                      ) : null;
                    })()}
                    {selectedStartTime && (
                      <div className="text-xs text-primary font-medium mt-1">
                        Hora de entrada: {formatTime(selectedStartTime)} — Hora de salida: {formatTime(new Date(parseISO(`${selectedDate}T${selectedStartTime}:00`).getTime() + getTotalServiceDurationMinutes() * 60 * 1000))}
                      </div>
                    )}
                  </div>
                )}
                   </div>
                   {/* Columna Derecha: Add-ons y Horas */}
                  <div className="flex flex-col space-y-4">
                    <div className="space-y-4">
                {/* Add-ons Selection */}
                {availableAddons.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Servicios adicionales (opcionales)
                    </Label>
                    <div className="space-y-2">
                      {availableAddons.map((addon: any) => {
                        const isSelected = selectedAddons.some((a: any) => a.id === addon.id);
                        
                        // Check if adding this addon causes overlap with existing reservations
                        const causesOverlap = !isSelected && !!selectedStartTime && (() => {
                          const start = parseISO(`${selectedDate} ${selectedStartTime}:00`);
                          const totalDuration = selectedArea.pricing_type === 'fixed'
                            ? (selectedArea.estimated_duration_minutes || 60)
                            : (duration * 60);
                          
                          const currentAddonDuration = getTotalAddonDuration();
                          const newTotalDuration = totalDuration + currentAddonDuration + (addon.additional_duration_minutes || 0);
                          const newEnd = new Date(start.getTime() + newTotalDuration * 60 * 1000);
                          
                          const nextBlock = getNextBlockStart(selectedStartTime);
                          return Boolean(nextBlock && newEnd > nextBlock);
                        })();

                        return (
                          <button
                            key={addon.id}
                            onClick={() => toggleAddon(addon)}
                            disabled={causesOverlap}
                            className={cn(
                              "w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all",
                              isSelected
                                ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                                : causesOverlap
                                  ? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                                  : "bg-white border-gray-100 hover:border-gray-200"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors",
                              isSelected ? "bg-primary border-primary" : "border-gray-300"
                            )}>
                              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{addon.name}</span>
                                <span className="text-sm font-bold text-primary">
                                  {addon.additional_cost > 0 ? `+${formatCurrency(addon.additional_cost)}` : 'Gratis'}
                                </span>
                              </div>
                              {addon.description && (
                                <p className="text-[10px] text-gray-400 truncate">{addon.description}</p>
                              )}
                              {addon.additional_duration_minutes > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-[#FF3B30]" />+{addon.additional_duration_minutes} min
                                </span>
                              )}
                              {causesOverlap && (
                                <p className="text-[9px] text-amber-600 font-bold mt-1 bg-amber-50 p-1 rounded border border-amber-100 animate-in fade-in slide-in-from-top-1 duration-300">
                                  ⚠️ Selecciona otro horario para poder agregar este servicio
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>

                <div className="space-y-4 order-4">
                  <Label className="text-sm font-medium text-gray-700">
                  {selectedArea.pricing_type === 'jornada'
                    ? 'Jornadas disponibles'
                    : 'Horas disponibles'
                  }
                </Label>
                {selectedArea.pricing_type === 'jornada' ? (
                  <div className="space-y-3">
                    {/* Jornada Diurna */}
                    {(() => {
                      const startTime = selectedArea.jornada_start_diurna || '08:00';
                      const endTime = selectedArea.jornada_end_diurna || '18:00';
                      const slotStart = parseISO(`${selectedDate} ${startTime}:00`);
                      const slotEnd = parseISO(`${selectedDate} ${endTime}:00`);

                      const isReserved = existingReservations.some(res => {
                        const resStart = parseISO(detoxTime(res.start_datetime));
                        const resEnd = parseISO(detoxTime(res.end_datetime));
                        return (slotStart < resEnd && slotEnd > resStart);
                      });

                      const maintenance = activeMaintenances.find(maint => {
                        const maintStart = parseISO(detoxTime(maint.starts_at));
                        const maintEnd = parseISO(detoxTime(maint.ends_at));
                        return (slotStart < maintEnd && slotEnd > maintStart);
                      });

                      const isPast = slotStart < new Date();
                      const isDisabled = isReserved || !!maintenance || isPast;

                      return (
                        <div className="relative group">
                          <Button
                            variant={selectedJornada === 'diurna' ? "default" : "outline"}
                            disabled={isDisabled}
                            onClick={() => {
                              setSelectedJornada('diurna');
                              setSelectedStartTime(startTime);
                              setJornadaError(null);
                            }}
                            className={cn(
                              "w-full h-16 justify-start gap-4 transition-all duration-300 rounded-2xl",
                              selectedJornada === 'diurna' ? "bg-primary text-white apple-shadow hover:scale-[1.01] border-none hover:bg-primary/90" : "border-gray-200 apple-shadow bg-white hover:bg-gray-50",
                              isDisabled && "opacity-50 cursor-not-allowed grayscale"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              selectedJornada === 'diurna' ? "bg-white/20" : "bg-primary/10"
                            )}>
                              <Sun className={cn("w-6 h-6", selectedJornada === 'diurna' ? "text-white" : "text-primary")} />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-base">Diurna</div>
                              <div className="text-xs opacity-80 font-medium">{formatTime(startTime)} - {formatTime(endTime)}</div>
                            </div>
                            <div className="ml-auto font-black text-lg">
                              {isFree ? 'Gratis' : formatCurrency(selectedArea.cost_jornada_diurna || 0)}
                            </div>
                          </Button>

                          {isDisabled && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                              {isPast ? 'Horario pasado' : maintenance ? `Aviso: ${maintenance.title}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Jornada Nocturna */}
                    {(() => {
                      const startTime = selectedArea.jornada_start_nocturna || '18:00';
                      const endTime = selectedArea.jornada_end_nocturna || '23:59';
                      const slotStart = parseISO(`${selectedDate} ${startTime}:00`);
                      const slotEnd = parseISO(`${selectedDate} ${endTime}:00`);

                      const isReserved = existingReservations.some(res => {
                        const resStart = parseISO(detoxTime(res.start_datetime));
                        const resEnd = parseISO(detoxTime(res.end_datetime));
                        return (slotStart < resEnd && slotEnd > resStart);
                      });

                      const maintenance = activeMaintenances.find(maint => {
                        const maintStart = parseISO(detoxTime(maint.starts_at));
                        const maintEnd = parseISO(detoxTime(maint.ends_at));
                        return (slotStart < maintEnd && slotEnd > maintStart);
                      });

                      const isPast = slotStart < new Date();
                      const isDisabled = isReserved || !!maintenance || isPast;

                      return (
                        <div className="relative group">
                          <Button
                            variant={selectedJornada === 'nocturna' ? "default" : "outline"}
                            disabled={isDisabled}
                            onClick={() => {
                              setSelectedJornada('nocturna');
                              setSelectedStartTime(startTime);
                              setJornadaError(null);
                            }}
                            className={cn(
                              "w-full h-14 justify-start gap-3",
                              selectedJornada === 'nocturna' ? "bg-primary border-primary text-white hover:bg-primary/90" : "border-gray-200",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Moon className="w-5 h-5" />
                            <div className="text-left flex-1">
                              <div className="font-medium">Nocturna</div>
                              <div className="text-xs opacity-80">{formatTime(startTime)} - {formatTime(endTime)}</div>
                            </div>
                            <div className="ml-auto font-bold">
                              {isFree ? 'Gratis' : formatCurrency(selectedArea.cost_jornada_nocturna || 0)}
                            </div>
                          </Button>

                          {isDisabled && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                              {isPast ? 'Horario pasado' : maintenance ? `Aviso: ${maintenance.title}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Día Completo */}
                    {(() => {
                      const startTime = selectedArea.jornada_start_diurna || '08:00';
                      const endTime = selectedArea.jornada_end_nocturna || '23:59';
                      const slotStart = parseISO(`${selectedDate} ${startTime}:00`);
                      const slotEnd = parseISO(`${selectedDate} ${endTime}:00`);

                      const isReserved = existingReservations.some(res => {
                        const resStart = parseISO(detoxTime(res.start_datetime));
                        const resEnd = parseISO(detoxTime(res.end_datetime));
                        return (slotStart < resEnd && slotEnd > resStart);
                      });

                      const maintenance = activeMaintenances.find(maint => {
                        const maintStart = parseISO(detoxTime(maint.starts_at));
                        const maintEnd = parseISO(detoxTime(maint.ends_at));
                        return (slotStart < maintEnd && slotEnd > maintStart);
                      });

                      const isPast = slotStart < new Date();
                      const isDisabled = isReserved || !!maintenance || isPast;

                      return (
                        <div className="relative group">
                          <Button
                            variant={selectedJornada === 'ambos' ? "default" : "outline"}
                            disabled={isDisabled}
                            onClick={() => {
                              setSelectedJornada('ambos');
                              setSelectedStartTime(startTime);
                              setJornadaError(null);
                            }}
                            className={cn(
                              "w-full h-14 justify-start gap-3",
                              selectedJornada === 'ambos' ? "bg-primary border-primary text-white hover:bg-primary/90" : "border-gray-200",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Calendar className="w-5 h-5" />
                            <div className="text-left flex-1">
                              <div className="font-medium">Completo</div>
                              <div className="text-xs opacity-80">{formatTime(startTime)} - {formatTime(endTime)}</div>
                            </div>
                            <div className="ml-auto font-bold">
                              {isFree ? 'Gratis' : formatCurrency(selectedArea.cost_jornada_ambos || 0)}
                            </div>
                          </Button>

                          {isDisabled && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                              {isPast ? 'Horario pasado' : maintenance ? `Aviso: ${maintenance.title}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const totalMinutes = selectedArea?.pricing_type === 'fixed'
                        ? getTotalServiceDurationMinutes()
                        : (duration * 60 + getTotalAddonDuration());
                      const endTimeStr = selectedStartTime
                        ? format(new Date(parseISO(`${selectedDate}T${selectedStartTime}:00`).getTime() + totalMinutes * 60 * 1000), 'HH:mm')
                        : '';
                      const hours = Math.floor(totalMinutes / 60);
                      const mins = totalMinutes % 60;
                      const durationLabel = hours > 0
                        ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}`
                        : `${mins} min`;
                      return selectedStartTime ? (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <Clock className="w-4 h-4 text-[#FF3B30]" />
                            <span>
                              {terminology.reservationLabel} de {formatTime(selectedStartTime)} a {formatTime(endTimeStr)} ({durationLabel})
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="grid grid-cols-5 sm:grid-cols-4 gap-2.5">
                      {(selectedArea?.pricing_type === 'fixed' ? getFixedTimeSlots() : baseTimeSlots).map((time: string) => {
                        const info = getSlotStatus(time);

                        const isOccupied = info.status !== 'available' && !(isAdmin && info.status === 'reserved');

                        const isInRange = selectedStartTime && (() => {
                          const totalMinutes = selectedArea?.pricing_type === 'fixed'
                            ? getTotalServiceDurationMinutes()
                            : (duration * 60 + getTotalAddonDuration());
                          const selectedHour = parseInt(selectedStartTime.split(':')[0]);
                          const selectedMin = parseInt(selectedStartTime.split(':')[1]) || 0;
                          const currentHour = parseInt(time.split(':')[0]);
                          const currentMin = parseInt(time.split(':')[1]) || 0;
                          const selectedTotalMin = selectedHour * 60 + selectedMin;
                          const currentTotalMin = currentHour * 60 + currentMin;
                          const endTotalMin = selectedTotalMin + totalMinutes;
                          return currentTotalMin >= selectedTotalMin && currentTotalMin < endTotalMin;
                        })();

                        return (
                          <div key={time} className="relative group">
                            <Button
                              variant="outline"
                              disabled={isOccupied}
                              onClick={() => setSelectedStartTime(time)}
                              className={cn(
                                "w-full h-10 sm:h-14 font-semibold rounded-lg sm:rounded-xl transition-all duration-300 text-[11px] leading-tight sm:text-sm sm:leading-normal whitespace-nowrap px-1.5 sm:px-3",
                                selectedStartTime === time
                                  ? "bg-primary text-white border-none scale-105 apple-shadow z-10 hover:bg-primary/90"
                                  : isInRange && !isOccupied
                                    ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                    : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300",
                                info.status === 'reserved' && !isAdmin && "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-60",
                                info.status === 'reserved' && isAdmin && "bg-amber-50 text-amber-600 border-amber-200 cursor-pointer hover:bg-amber-100",
                                info.status === 'past' && "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-60",
                                info.status === 'maintenance' && "bg-rose-50 text-rose-400 border-rose-100 cursor-not-allowed",
                                info.status === 'break' && "bg-amber-50 text-amber-400 border-amber-100 cursor-not-allowed"
                              )}
                            >
                              {formatTime(time)}
                              {info.status === 'maintenance' && (
                                <Hammer className="w-3 h-3 ml-1" />
                              )}
                              {info.status === 'break' && (
                                <span className="text-[8px] ml-0.5">🍽</span>
                              )}
                            </Button>

                            {isOccupied && !(isAdmin && info.status === 'reserved') && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                                {info.status === 'maintenance' ? `Aviso: ${info.reason}` : info.status === 'break' ? 'Hora de almuerzo' : info.status === 'past' ? 'Horario pasado' : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            )}
                            {isAdmin && info.status === 'reserved' && info.conflicts && info.conflicts.length > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-amber-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 min-w-[200px]">
                                <div className="font-bold mb-1">⚠️ Ocupado por:</div>
                                {info.conflicts.map((c: any, ci: number) => (
                                  <div key={ci} className="border-t border-amber-700/50 pt-1 mt-1">
                                    <div className="font-medium">{c.userName}</div>
                                    <div className="text-[10px] text-amber-200">{c.areaName} · {formatTime(detoxTime(c.start))} - {formatTime(detoxTime(c.end))}</div>
                                    {c.userPhone && (
                                      <a href={`tel:${c.userPhone.replace(/[^0-9+]/g, '')}`} className="text-[10px] text-blue-300 hover:text-blue-200 underline" onClick={e => e.stopPropagation()}>
                                        📞 {c.userPhone}
                                      </a>
                                    )}
                                  </div>
                                ))}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-900" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-2 text-xs text-gray-500 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-white border border-gray-200" />
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" />
                    <span>Ocupado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
                    <span>Almuerzo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                    <span>Aviso</span>
                  </div>
                  </div>
                   </div>
                </div>
                 </div>

                <div className="mt-6">
                  {actionBlock}
                </div>
              </>
              );
            })()}

             {jornadaError && (
               <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                 <AlertCircle className="w-4 h-4" />
                 {jornadaError}
               </div>
             )}
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedArea && (
        <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto">
          <CardHeader className="pb-6 text-center border-b border-gray-50 pt-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-primary shadow-sm" />
            </div>
            <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">Confirmación Final</CardTitle>
            <CardDescription className="text-gray-500 font-medium">Revisa los detalles antes de finalizar</CardDescription>
          </CardHeader>
          <CardContent className="py-6 space-y-6">
            <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{terminology.areaLabel}</span>
                <span className="font-bold text-gray-900">{selectedArea.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Fecha</span>
                <span className="font-bold text-gray-900">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Horario</span>
                <span className="font-bold text-gray-900 text-right">
                  {selectedArea.pricing_type === 'jornada'
                    ? getJornadaScheduleText()
                    : (() => {
                        const totalMinutes = selectedArea.pricing_type === 'fixed'
                          ? getTotalServiceDurationMinutes()
                          : (duration * 60 + getTotalAddonDuration());
                        const endTime = selectedStartTime && selectedDate
                          ? format(new Date(parseISO(`${selectedDate}T${selectedStartTime}:00`).getTime() + totalMinutes * 60 * 1000), 'HH:mm')
                          : '--:--';
                        return (
                          <span className="flex flex-col items-end">
                            <span>{formatTime(selectedStartTime)} - {formatTime(endTime)}</span>
                            {selectedArea.pricing_type === 'fixed' && (
                              <span className="text-[10px] text-primary font-medium">
                                Duración: {totalMinutes} min
                              </span>
                            )}
                            {selectedArea.pricing_type !== 'fixed' && getTotalAddonDuration() > 0 && (
                              <span className="text-[10px] text-primary font-medium">
                                Incluye +{getTotalAddonDuration()} min por add-ons
                              </span>
                            )}
                          </span>
                        );
                      })()
                  }
                </span>
              </div>
              {selectedArea.pricing_type !== 'jornada' && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Hora de entrada</span>
                <span className="font-bold text-gray-900">{formatTime(selectedStartTime)}</span>
              </div>
              )}
              {selectedAddons.length > 0 && (
                <div className="py-2 border-b border-gray-200/50">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Servicios adicionales</span>
                  <div className="mt-1 space-y-1">
                    {selectedAddons.map((addon: any) => {
                      const dHours = Math.floor(addon.additional_duration_minutes / 60);
                      const dMins = addon.additional_duration_minutes % 60;
                      const durLabel = dHours > 0 ? `${dHours}h${dMins > 0 ? ` ${dMins}min` : ''}` : dMins > 0 ? `${dMins} min` : '';
                      return (
                        <div key={addon.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            {addon.name}
                            {durLabel && <span className="text-[10px] text-gray-400 ml-1">(+{durLabel})</span>}
                          </span>
                          <span className="font-bold text-gray-900">{formatCurrency(addon.additional_cost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {isEditing ? (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-sm text-amber-600 font-bold uppercase tracking-wider">Abono previo</span>
                    <span className="font-black text-amber-600">{formatCurrency(reservationToEdit?.total_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <span className="text-base font-black text-gray-900 uppercase tracking-tighter italic">Total extra a pagar</span>
                    <span className="text-3xl font-black text-primary drop-shadow-sm">
                      {(calculateTotalCost() - (reservationToEdit?.total_cost || 0)) > 0
                        ? formatCurrency(calculateTotalCost() - (reservationToEdit?.total_cost || 0))
                        : formatCurrency(0)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center pt-4">
                  <span className="text-base font-black text-gray-900 uppercase tracking-tighter italic">{isFree ? 'Costo' : 'Total a pagar'}</span>
                  <span className="text-3xl font-black text-primary drop-shadow-sm">
                    {isFree ? 'Gratis' : formatCurrency(calculateTotalCost())}
                  </span>
                </div>
              )}
            </div>

            <div className={cn(
              "border rounded-2xl p-4 flex gap-4 transition-all duration-300",
              isFree
                ? "bg-indigo-50 border-indigo-100 text-indigo-800"
                : "bg-amber-50 border-amber-100 text-amber-800"
            )}>
              <AlertCircle className={cn(
                "w-6 h-6 shrink-0 mt-0.5",
                isFree ? "text-indigo-500" : "text-amber-500"
              )} />
              <p className="text-sm font-medium leading-relaxed opacity-90">
                {isEditing
                  ? `Al confirmar edición, la ${terminology.reservationLabel.toLowerCase()} quedará pendiente de aprobación. Si hay un excedente de cobro, un administrador validará los pagos.`
                  : isFree
                    ? `Al confirmar, se generará la ${terminology.reservationLabel.toLowerCase()} pendiente de validación sin costo adicional.`
                    : "Al confirmar, se generará una solicitud pendiente de validación por parte de la administración."
                }
              </p>
            </div>

            {/* Datos de contacto para invitados */}
            {isGuestUser && (
              <div className="space-y-4 p-5 bg-primary/5 rounded-2xl border border-primary/10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-primary font-black text-base mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  Datos de contacto
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guestName" className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Nombre Completo</Label>
                    <Input
                      id="guestName"
                      placeholder="Tu nombre completo"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-12 rounded-xl bg-white border-gray-200 focus:ring-primary/20 focus:border-primary apple-shadow-sm transition-all text-gray-900 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone" className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Teléfono / WhatsApp</Label>
                    <Input
                      id="guestPhone"
                      placeholder="300 123 4567"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="h-12 rounded-xl bg-white border-gray-200 focus:ring-primary/20 focus:border-primary apple-shadow-sm transition-all text-gray-900 font-medium"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 font-medium px-1 leading-tight">
                  Usaremos estos datos para validar tu comprobante de pago y confirmar tu reserva de forma segura.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-8 pt-2">
            <Button
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-lg h-14 rounded-2xl apple-shadow hover:apple-shadow-hover transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none"
              onClick={handleReserve}
              disabled={createMutation.isPending || updateMutation.isPending || (hasPendingReservation && !isGuestUser)}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Procesando solicitud..."
                : isFree ? `Confirmar ${terminology.reservationLabel} Gratis` : `Confirmar ${terminology.reservationLabel}`}
            </Button>
            <Button variant="ghost" className="w-full text-gray-500 font-bold hover:bg-gray-50 h-10 rounded-xl" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Modificar detalles
            </Button>
          </CardFooter>
        </Card>
      )}
      <AlertDialog
        open={isErrorAlertOpen}
        onOpenChange={setIsErrorAlertOpen}
        title={`Error en la ${terminology.reservationLabel}`}
        description={errorMessage}
        confirmText="Entendido"
        showCancel={false}
        onConfirm={() => setIsErrorAlertOpen(false)}
        variant="destructive"
      />
      {/* Modal Promocional para Invitados - Aparece al SELECCIONAR área */}
      {showPromoModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPromoModal(false); }}
        >
          <Card className="max-w-md w-full border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            {/* Close button */}
            <button
              onClick={() => setShowPromoModal(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <div className="h-3 bg-primary" />
            <CardHeader className="text-center pt-8 pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">¡Reserva como invitado!</CardTitle>
              <CardDescription className="text-base mt-2">
                Para continuar con tu {terminology.reservationLabel.toLowerCase()} tienes dos opciones:
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="space-y-4">
                <Button
                  onClick={() => openAuthModal('register')}
                  className="w-full h-12 font-bold shadow-lg shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Registrarme y obtener beneficios
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-bold">O también</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPromoModal(false);
                    setStep(2);
                  }}
                  className="w-full h-12 font-medium border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Continuar sin registro
                </Button>
              </div>

              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                * El registro te permite ver tu historial, recibir recordatorios y acumular beneficios en el sistema de bonificaciones.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
