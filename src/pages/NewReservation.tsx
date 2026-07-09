import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useCommonAreasQuery } from '@/hooks/useResources';
import { useCreateReservationMutation, useUpdateReservationMutation } from '@/hooks/useReservations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
  HelpCircle,
  Gift,
  Package,
  User,
  LogIn,
  UserPlus,
  Building2,
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { format, addMinutes, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomService {
  id: string;
  name: string;
  description: string;
  cost: number;
  duration: number;
  image_url?: string;
}

interface AddonOption {
  id: string;
  name: string;
  description: string;
  additional_cost: number;
  additional_duration_minutes: number;
}

export default function NewReservationPage() {
  const { profile, openAuthModal, terminology } = useAuth();
  const [orgBusinessType, setOrgBusinessType] = useState<string>('residential');
  const isResidential = orgBusinessType === 'residential';

  useEffect(() => {
    if (profile?.organization_id) {
      supabase.from('organizations').select('business_type').eq('id', profile.organization_id).single().then(({ data }) => {
        if (data) setOrgBusinessType(data.business_type);
      });
    }
  }, [profile?.organization_id]);
  const { status: subscriptionStatus, daysUntilExpiry, previousSubscriptionExpiredBeyond20Days, loading: subscriptionLoading, maxReservationsPerDay, todayReservationsCount } = useSubscriptionStatus(profile?.organization_id);
  const navigate = useNavigate();
  const { id } = useParams();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedHourSlots, setSelectedHourSlots] = useState<string[]>([]);
  const [selectedJornada, setSelectedJornada] = useState<string>('');

  const [availableServices, setAvailableServices] = useState<CustomService[]>([]);
  const [selectedService, setSelectedService] = useState<CustomService | null>(null);
  const [availableAddons, setAvailableAddons] = useState<AddonOption[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);
  const [activeMaintenances, setActiveMaintenances] = useState<any[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [bonusConfig, setBonusConfig] = useState<any>(null);
  const [userReservationCount, setUserReservationCount] = useState(0);
  const [serviceBonusMap, setServiceBonusMap] = useState<Record<string, { goal: number; discountPct: number; count: number }>>({});
  const [resourceBonusMap, setResourceBonusMap] = useState<Record<string, { goal: number; discountPct: number; count: number }>>({});
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [operationSchedules, setOperationSchedules] = useState<any[]>([]);
  const [maxReservationDays, setMaxReservationDays] = useState<number | null>(null);

  const { data: areasData = [] } = useCommonAreasQuery(profile?.organization_id);
  const createMutation = useCreateReservationMutation();
  const updateMutation = useUpdateReservationMutation();

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

      if (isEditing && id) query = query.neq('id', id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.organization_id && !!targetUserIdForPendingCheck,
  });

  const hasPendingReservation = pendingReservations.length > 0;

  const { data: users = [] } = useQuery({
    queryKey: ['users', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select(`user_id, phone, apartment, profiles (id, full_name, email)`)
        .eq('organization_id', profile?.organization_id)
        .eq('role', 'user');

      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
        email: m.profiles.email,
        phone: m.phone || '',
        apartment: m.apartment
      })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    enabled: isAdmin && !!profile?.organization_id,
  });

  const { data: reservationToEdit } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, resources(*), reservation_services(service_id, charged_price)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!id,
  });

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
    if (reservationToEdit && isEditing) {
      if (reservationToEdit.user_id !== profile?.id && !isAdmin) return;
      if (reservationToEdit.status !== 'pending_validation' && !isAdmin) return;

      setSelectedArea(reservationToEdit.resources);
      setSelectedUserId(reservationToEdit.user_id);
      const startDate = parseISO(detoxTime(reservationToEdit.start_datetime));
      setSelectedDate(format(startDate, 'yyyy-MM-dd'));
      setSelectedStartTime(format(startDate, 'HH:mm'));

      fetchLinkedServicesForEdit(reservationToEdit.resources.id, reservationToEdit.reservation_services);
      fetchBusySlots(reservationToEdit.resources.id);
      fetchOperationSchedules();
      setStep(3);
    }
  }, [reservationToEdit, isEditing, profile?.id, isAdmin]);

  const fetchLinkedServicesForEdit = async (employeeId: string, savedServices: any[]) => {
    const { data } = await supabase
      .from('resource_services')
      .select('*, services(*)')
      .eq('resource_id', employeeId);

    if (data) {
      const mapped = data
        .filter((row: any) => row.services?.is_active)
        .map((row: any) => ({
          id: row.services.id,
          name: row.services.name,
          description: row.services.description || '',
          cost: row.custom_price ?? row.services.base_cost ?? 0,
          duration: row.services.duration_minutes || 30,
          image_url: row.services.image_url,
        }));
      setAvailableServices(mapped);

      const savedIds = savedServices.map((s: any) => s.service_id);
      const matched = mapped.find((m: CustomService) => savedIds.includes(m.id));
      if (matched) {
        setSelectedService(matched);
        fetchServiceAddons(matched.id, employeeId);
      }
    }
  };

  const blockingError = (() => {
    if (subscriptionLoading) return null;
    if (subscriptionStatus === 'cancelled') return { title: 'Suscripción cancelada', message: 'Tu suscripción ha sido cancelada. Contacta al administrador para reactivar tu cuenta.' };
    if (subscriptionStatus === 'inactive' || (subscriptionStatus === 'past_due' && daysUntilExpiry !== undefined && daysUntilExpiry < -20) || (subscriptionStatus === 'past_due' && previousSubscriptionExpiredBeyond20Days)) return { title: 'Servicio temporalmente inhabilitado', message: 'Servicio temporalmente inhabilitado.' };

    if (isEditing && reservationToEdit) {
      if (reservationToEdit.user_id !== profile?.id && !isAdmin) return { title: 'Sin permisos', message: 'No tienes permiso para editar esta reserva.' };
      if (reservationToEdit.status !== 'pending_validation' && !isAdmin) return { title: 'Reserva ya validada', message: 'La reserva ya se validó y no se puede editar.' };
    }

    if (hasPendingReservation && !isGuestUser) {
      const showBlock = !isAdmin || (isAdmin && selectedUserId);
      if (showBlock) {
        return {
          title: 'Reserva pendiente',
          message: isAdmin
            ? 'El cliente seleccionado tiene una reserva pendiente. No puede realizar un nuevo servicio hasta que se complete la actual.'
            : 'Tienes una reserva pendiente. No puedes solicitar un nuevo servicio hasta que se complete la actual.'
        };
      }
    }

    if (isGuestUser && isEditing) return { title: 'Invitado', message: 'Como invitado no puedes editar reservas.' };

    if (maxReservationsPerDay !== null && todayReservationsCount >= maxReservationsPerDay && !isAdmin) {
      return {
        title: 'Límite diario alcanzado',
        message: `Has alcanzado el límite de ${maxReservationsPerDay} reservas por día. Intenta de nuevo mañana o contacta al administrador.`
      };
    }

    return null;
  })();

  const mainDuration = isResidential
    ? (selectedArea?.pricing_type === 'jornada' ? (selectedArea.jornada_hours_diurna || 10) * 60 + (selectedArea.jornada_hours_nocturna || 6) * 60 : selectedHourSlots.length * 60 || selectedArea?.estimated_duration_minutes || 60)
    : (selectedService?.duration || 60);
  const addonsDuration = selectedAddons.reduce((sum, a) => sum + (a.additional_duration_minutes || 0), 0);
  const totalSelectedDuration = mainDuration + addonsDuration;
  const mainCost = isResidential
    ? (selectedArea?.is_free ? 0 : selectedArea?.pricing_type === 'hourly' ? selectedHourSlots.length * (selectedArea?.cost_per_hour || 0) : selectedArea?.pricing_type === 'jornada' ? (selectedJornada === 'diurna' ? selectedArea?.cost_jornada_diurna : selectedJornada === 'nocturna' ? selectedArea?.cost_jornada_nocturna : selectedArea?.cost_jornada_ambos) || 0 : selectedArea?.fixed_cost || 0)
    : (selectedService?.cost || 0);
  const addonsCost = selectedAddons.reduce((sum, a) => sum + (a.additional_cost || 0), 0);
  const totalSelectedCost = mainCost + addonsCost;

  const filteredUsers = users;

  const fetchBusySlots = async (employeeId: string) => {
    const { data: resData } = await supabase
      .from('reservations')
      .select('start_datetime, end_datetime, resource_id, profiles:user_id(full_name, phone), resources(name)')
      .eq('resource_id', employeeId)
      .eq('organization_id', profile?.organization_id)
      .in('status', ['approved', 'pending_validation', 'pending_payment']);

    setExistingReservations(resData || []);

    const { data: maintData } = await supabase
      .from('maintenance_notices')
      .select('starts_at, ends_at, severity, title, content')
      .or(`resource_id.eq.${employeeId},resource_id.is.null`)
      .eq('organization_id', profile?.organization_id)
      .eq('is_active', true);

    setActiveMaintenances(maintData || []);
  };

  const fetchServiceAddons = async (serviceId: string, resourceId: string) => {
    const { data: configs } = await supabase
      .from('resource_addon_configs')
      .select('addon_id')
      .eq('resource_id', resourceId)
      .eq('service_id', serviceId);

    if (configs && configs.length > 0) {
      const addonIds = configs.map((c: any) => c.addon_id);
      const { data } = await supabase
        .from('service_addons')
        .select('*')
        .in('id', addonIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      setAvailableAddons(data || []);
    } else {
      setAvailableAddons([]);
    }
    setSelectedAddons([]);
  };

  const handleEmployeeClick = async (employee: any) => {
    if (isAdmin && !selectedUserId) {
      setUserError('Por favor selecciona un usuario antes de continuar.');
      return;
    }

    if (isGuestUser) {
      setPendingEmployee(employee);
      setShowGuestModal(true);
      return;
    }

    proceedWithEmployee(employee);
  };

  const proceedWithEmployee = async (employee: any) => {
    setUserError(null);
    setSelectedArea(employee);
    setSelectedService(null);
    setSelectedAddons([]);
    setSelectedStartTime('');

    fetchBusySlots(employee.id);
    if (!isAdmin) fetchBonusInfo(employee.id, profile?.id);
    fetchOperationSchedules();

    if (isResidential) {
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_services')
        .select('*, services(*)')
        .eq('resource_id', employee.id);
      if (error) throw error;

      if (data) {
        const mapped = data
          .filter((row: any) => row.services?.is_active)
          .map((row: any) => ({
            id: row.services.id,
            name: row.services.name,
            description: row.services.description || '',
            cost: row.custom_price ?? row.services.base_cost ?? 0,
            duration: row.services.duration_minutes || 30,
            image_url: row.services.image_url,
          }));
        setAvailableServices(mapped);
      }
    } catch (e: any) {
      toast.error('Error al cargar servicios: ' + e.message);
    } finally {
      setLoading(false);
    }

    setStep(2);
  };

  const handleContinueAsGuest = () => {
    setShowGuestModal(false);
    if (pendingEmployee) {
      proceedWithEmployee(pendingEmployee);
    }
  };

  const handleSelectService = async (service: CustomService) => {
    setSelectedService(service);
    setSelectedStartTime('');
    fetchServiceAddons(service.id, selectedArea.id);
    if (!isAdmin) fetchBonusInfo(selectedArea.id, profile?.id);
    setStep(3);
  };

  const handleGoBackFromSchedule = () => {
    if (isResidential) {
      setSelectedArea(null);
      setStep(1);
    } else {
      setSelectedService(null);
      setSelectedAddons([]);
      setStep(2);
    }
  };

  const fetchBonusInfo = async (employeeId: string, targetUserId?: string) => {
    if (!profile?.id || isGuestUser) { setBonusConfig(null); setUserReservationCount(0); setServiceBonusMap({}); setResourceBonusMap({}); return; }

    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('bonus_system_active')
        .eq('id', profile?.organization_id)
        .single();

      if (!org?.bonus_system_active) { setBonusConfig(null); setServiceBonusMap({}); setResourceBonusMap({}); return; }

      const effectiveUserId = targetUserId || profile.id;

      const { data: configs } = await supabase
        .from('bonus_configs')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .eq('is_active', true);

      if (!configs || configs.length === 0) {
        setBonusConfig(null); setUserReservationCount(0); setServiceBonusMap({}); setResourceBonusMap({}); return;
      }

      const serviceIds = configs.filter((c: any) => c.service_id).map((c: any) => c.service_id);
      const resourceIds = configs.filter((c: any) => c.resource_id).map((c: any) => c.resource_id);
      const countByService: Record<string, number> = {};
      const countByResource: Record<string, number> = {};

      if (serviceIds.length > 0) {
        const { data: allRs } = await supabase
          .from('reservation_services')
          .select('service_id, reservations!inner(user_id, status)')
          .in('service_id', serviceIds)
          .eq('reservations.user_id', effectiveUserId)
          .eq('reservations.status', 'approved');
        (allRs || []).forEach((rs: any) => { countByService[rs.service_id] = (countByService[rs.service_id] || 0) + 1; });
      }

      if (resourceIds.length > 0) {
        const { data: allRes } = await supabase
          .from('reservations')
          .select('resource_id')
          .in('resource_id', resourceIds)
          .eq('user_id', effectiveUserId)
          .eq('status', 'approved');
        (allRes || []).forEach((r: any) => { countByResource[r.resource_id] = (countByResource[r.resource_id] || 0) + 1; });
      }

      const sMap: Record<string, { goal: number; discountPct: number; count: number }> = {};
      const rMap: Record<string, { goal: number; discountPct: number; count: number }> = {};

      for (const config of configs) {
        if (config.service_id) {
          sMap[config.service_id] = { goal: config.reservations_required, discountPct: config.discount_percentage, count: countByService[config.service_id] || 0 };
        } else if (config.resource_id) {
          rMap[config.resource_id] = { goal: config.reservations_required, discountPct: config.discount_percentage, count: countByResource[config.resource_id] || 0 };
        }
      }

      setServiceBonusMap(sMap);
      setResourceBonusMap(rMap);

      const matchingConfig = configs.find((c: any) =>
        (c.service_id && selectedService && c.service_id === selectedService.id) ||
        (c.resource_id && c.resource_id === employeeId)
      ) || null;
      setBonusConfig(matchingConfig);

      if (matchingConfig) {
        const c = matchingConfig.service_id ? (sMap[matchingConfig.service_id]?.count || 0) : (rMap[matchingConfig.resource_id]?.count || 0);
        setUserReservationCount(c);
      } else {
        setUserReservationCount(0);
      }
    } catch {
      setBonusConfig(null); setUserReservationCount(0); setServiceBonusMap({}); setResourceBonusMap({});
    }
  };

  const getBonusForService = (serviceId: string) => {
    const fromService = serviceBonusMap[serviceId];
    if (fromService) return fromService;
    if (selectedArea) {
      return resourceBonusMap[selectedArea.id] || null;
    }
    return null;
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

  const getOperationHoursForDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    const dow = date.getDay();
    const schedule = operationSchedules.find(s => s.day_of_week === dow);
    if (!schedule) return null;
    return { start: schedule.start_time, end: schedule.end_time };
  };

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
    let current = startH * 60 + startM;
    while (current + totalSelectedDuration <= endTotalMin) {
      const slotEnd = current + totalSelectedDuration;
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

  const getAllHalfHourSlots = (): string[] => {
    const hours = getOperationHoursForDate(selectedDate);
    if (!hours) return [];
    const startH = parseInt(hours.start.split(':')[0]);
    const startM = parseInt(hours.start.split(':')[1] || '0');
    const endH = parseInt(hours.end.split(':')[0]);
    const endM = parseInt(hours.end.split(':')[1] || '0');
    const endTotalMin = endH * 60 + endM;
    const slots: string[] = [];
    let current = startH * 60 + startM;
    while (current + 60 <= endTotalMin) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      if (m === 0) slots.push(`${h.toString().padStart(2, '0')}:00`);
      current += 60;
    }
    return slots;
  };

  const toggleHourSlot = (time: string) => {
    setSelectedHourSlots(prev => {
      if (prev.includes(time)) {
        if (prev[prev.length - 1] === time) return prev.slice(0, -1);
        return prev;
      }
      const maxSlots = selectedArea?.max_hours_per_reservation || 4;
      if (prev.length >= maxSlots) return prev;
      if (prev.length === 0) return [time];
      const allSlots = getAllHalfHourSlots();
      const lastIdx = allSlots.indexOf(prev[prev.length - 1]);
      const clickedIdx = allSlots.indexOf(time);
      if (clickedIdx === lastIdx + 1) return [...prev, time];
      return [time];
    });
  };

  const quickSelectHours = (count: number) => {
    const allSlots = getAllHalfHourSlots();
    const now = new Date();
    const isAvailable = (time: string) => {
      const t = parseISO(`${selectedDate}T${time}:00`);
      if (t < now) return false;
      return !existingReservations.some(res => {
        const rs = parseISO(detoxTime(res.start_datetime));
        const re = parseISO(detoxTime(res.end_datetime));
        return t >= rs && t < re;
      });
    };

    // If already have a selection, try extending from the last selected slot
    if (selectedHourSlots.length > 0) {
      const lastIdx = allSlots.indexOf(selectedHourSlots[selectedHourSlots.length - 1]);
      const startIdx = selectedHourSlots.length >= count ? allSlots.indexOf(selectedHourSlots[0]) : lastIdx + 1 - (count - 1);
      for (let i = Math.max(0, startIdx); i <= allSlots.length - count; i++) {
        let contiguous = true;
        for (let j = 0; j < count; j++) {
          if (!isAvailable(allSlots[i + j])) { contiguous = false; break; }
        }
        if (contiguous) {
          setSelectedHourSlots(allSlots.slice(i, i + count));
          return;
        }
      }
    }

    // No selection or couldn't extend: find first contiguous block
    for (let i = 0; i <= allSlots.length - count; i++) {
      let contiguous = true;
      for (let j = 0; j < count; j++) {
        if (!isAvailable(allSlots[i + j])) { contiguous = false; break; }
      }
      if (contiguous) {
        setSelectedHourSlots(allSlots.slice(i, i + count));
        return;
      }
    }
  };

  useEffect(() => {
    if (bonusConfig) {
      const goal = bonusConfig.reservations_required;
      const hasDiscount = userReservationCount > 0 && (userReservationCount % goal) === 0;
      setAppliedDiscount(hasDiscount ? bonusConfig.discount_percentage : 0);
    } else {
      setAppliedDiscount(0);
    }
  }, [bonusConfig, userReservationCount]);

  useEffect(() => {
    if (isAdmin && selectedUserId && selectedArea) {
      fetchBonusInfo(selectedArea.id, selectedUserId);
    }
  }, [selectedUserId, selectedArea?.id, selectedService?.id]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedArea) fetchBusySlots(selectedArea.id);
  };

  const getSlotStatus = (time: string) => {
    const slotStart = parseISO(`${selectedDate}T${time}:00`);
    if (slotStart < new Date()) return { status: 'past' as const };

    const slotEnd = new Date(slotStart.getTime() + totalSelectedDuration * 60 * 1000);

    const isReserved = existingReservations.some(res => {
      const resStart = parseISO(detoxTime(res.start_datetime));
      const resEnd = parseISO(detoxTime(res.end_datetime));
      return (slotStart < resEnd && slotEnd > resStart);
    });

    if (isReserved) {
      const conflicts = existingReservations.filter(res => {
        const resStart = parseISO(detoxTime(res.start_datetime));
        const resEnd = parseISO(detoxTime(res.end_datetime));
        return (slotStart < resEnd && slotEnd > resStart);
      });
      return {
        status: 'reserved' as const,
        conflicts: conflicts.map((c: any) => ({
          userName: c.profiles?.full_name || 'Usuario',
          userPhone: c.profiles?.phone || '',
          areaName: c.resources?.name || '',
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

  const calculateTotalCost = () => {
    const subtotal = totalSelectedCost;
    if (appliedDiscount > 0) return subtotal * (1 - appliedDiscount / 100);
    return subtotal;
  };

  // Returns the actual HH:mm clock string for the start of the reservation,
  // regardless of whether selectedStartTime is a clock time or a jornada key.
  const getActualStartTimeStr = (): string => {
    if (!selectedArea) return '';
    // Hourly: start = first selected hour slot
    if (isResidential && selectedArea.pricing_type === 'hourly') {
      return selectedHourSlots[0] || '';
    }
    if (!selectedStartTime) return '';
    if (isResidential && selectedArea.pricing_type === 'jornada') {
      if (selectedStartTime === 'diurna') return selectedArea.jornada_start_diurna || '08:00';
      if (selectedStartTime === 'nocturna') return selectedArea.jornada_start_nocturna || '18:00';
      if (selectedStartTime === 'ambos') return selectedArea.jornada_start_diurna || '08:00';
      return selectedStartTime;
    }
    return selectedStartTime;
  };

  const getActualEndTimeStr = (): string => {
    if (!selectedArea) return '';
    if (isResidential && selectedArea.pricing_type === 'jornada') {
      if (selectedStartTime === 'diurna') return selectedArea.jornada_end_diurna || '18:00';
      if (selectedStartTime === 'nocturna') return selectedArea.jornada_end_nocturna || '23:59';
      if (selectedStartTime === 'ambos') return selectedArea.jornada_end_nocturna || '23:59';
    }
    return '';
  };

  const getEndTime = () => {
    if (!selectedArea) return '';
    // Hourly: end = last slot + 60 minutes
    if (isResidential && selectedArea.pricing_type === 'hourly') {
      if (selectedHourSlots.length === 0) return '';
      const lastSlot = selectedHourSlots[selectedHourSlots.length - 1];
      const parsed = parseISO(`${selectedDate}T${lastSlot}:00`);
      if (isNaN(parsed.getTime())) return '';
      return format(addMinutes(parsed, 60), "yyyy-MM-dd'T'HH:mm:ss");
    }
    if (!selectedStartTime) return '';
    const actualStart = getActualStartTimeStr();
    if (!actualStart) return '';
    if (isResidential && selectedArea.pricing_type === 'jornada') {
      const actualEnd = getActualEndTimeStr();
      return `${selectedDate}T${actualEnd}:00`;
    }
    const parsed = parseISO(`${selectedDate}T${actualStart}:00`);
    if (isNaN(parsed.getTime())) return '';
    return format(addMinutes(parsed, totalSelectedDuration || 60), "yyyy-MM-dd'T'HH:mm:ss");
  };

  const toggleAddonSelection = (addon: AddonOption) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) return prev.filter(a => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const handleReserve = async () => {
    const isHourly = isResidential && selectedArea?.pricing_type === 'hourly';
    const isJornada = isResidential && selectedArea?.pricing_type === 'jornada';

    // For hourly: need at least one slot selected; for others: need selectedStartTime
    if (!profile || !selectedArea) return;
    if (isHourly && selectedHourSlots.length === 0) return;
    if (!isHourly && !selectedStartTime) return;
    if (!isResidential && !selectedService) return;

    if (isGuestUser && (!guestName || !guestPhone)) {
      setErrorMessage('Por favor ingresa tu nombre y teléfono de contacto');
      setIsErrorAlertOpen(true);
      return;
    }

    if ((isGuestUser || isAdmin) && guestPhone) {
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('guest_phone', guestPhone)
        .in('status', ['pending_payment', 'pending_validation']);

      if (count && count > 0) {
        setErrorMessage(`Ya existe una reserva pendiente de validación asociada a tu teléfono.`);
        setIsErrorAlertOpen(true);
        return;
      }
    }

    const actualStart = getActualStartTimeStr();
    // Only validate slot availability for non-jornada, non-hourly bookings
    if (!isJornada && !isHourly) {
      const info = getSlotStatus(actualStart);
      if (info.status !== 'available') {
        setErrorMessage(`El horario seleccionado ya no está disponible.`);
        setIsErrorAlertOpen(true);
        return;
      }
    }

    const start = `${selectedDate}T${actualStart}:00`;
    const end = getEndTime();
    if (!start || !end) {
      setErrorMessage('No se pudo calcular el horario de la reserva. Verifica los datos.');
      setIsErrorAlertOpen(true);
      return;
    }
    const totalCost = calculateTotalCost();

    if (isAdmin && !selectedUserId) {
      setErrorMessage(`Por favor selecciona un usuario para registrar la reserva.`);
      setIsErrorAlertOpen(true);
      return;
    }

    let reservationUserId = (isAdmin && selectedUserId) ? selectedUserId : profile.id;

    if (isGuestUser && profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('guest_user_id')
        .eq('id', profile.organization_id)
        .single();
      if (org?.guest_user_id && org.guest_user_id !== profile.id) {
        reservationUserId = org.guest_user_id;
      }
    }

    const reservationData: any = {
      user_id: reservationUserId,
      resource_id: selectedArea.id,
      start_datetime: start,
      end_datetime: end,
      total_cost: totalCost,
      organization_id: profile?.organization_id,
      status: 'pending_validation',
      guest_name: guestName || null,
      guest_phone: guestPhone || null
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: reservationData });
        await supabase.from('reservation_services').delete().eq('reservation_id', id);
        await supabase.from('reservation_addons').delete().eq('reservation_id', id);

        if (!isResidential && selectedService) {
          await supabase.from('reservation_services').insert({
            reservation_id: id,
            service_id: selectedService.id,
            charged_price: selectedService.cost
          });
          if (selectedAddons.length > 0) {
            await supabase.from('reservation_addons').insert(selectedAddons.map(a => ({
              reservation_id: id, addon_id: a.id, charged_price: a.additional_cost
            })));
          }
        }
      } else {
        const result = await createMutation.mutateAsync(reservationData);
        if (result?.id) {
          if (!isResidential && selectedService) {
            await supabase.from('reservation_services').insert({
              reservation_id: result.id,
              service_id: selectedService.id,
              charged_price: selectedService.cost
            });
            if (selectedAddons.length > 0) {
              await supabase.from('reservation_addons').insert(selectedAddons.map(a => ({
                reservation_id: result.id, addon_id: a.id, charged_price: a.additional_cost
              })));
            }
          }
        }
      }

      const targetPath = isGuestUser
        ? `/${profile?.organization_slug}`
        : (isAdmin ? '/admin/reservations' : '/reservations/my');

      navigate(targetPath);
      toast.success(isEditing ? `${terminology.reservationLabel} actualizada con éxito` : `${terminology.reservationLabel} creada con éxito`);
    } catch (error: any) {
      setErrorMessage(error.message || `Error al procesar la reserva`);
      setIsErrorAlertOpen(true);
    }
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const [currentMonth, setCurrentMonth] = useState(initialDate ? parseISO(initialDate) : new Date());
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  if (blockingError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-none shadow-sm bg-white text-center p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <HelpCircle className="w-12 h-12" />
            </div>
          </div>
          <CardTitle className="text-xl mb-4">{blockingError.title}</CardTitle>
          <CardDescription className="text-base mb-6">{blockingError.message}</CardDescription>
          <Button onClick={() => navigate(isAdmin ? '/admin/reservations' : '/reservations/my')}>{isAdmin ? 'Ir a Gestión de Citas' : 'Ver mis reservas'}</Button>
        </Card>
      </div>
    );
  }

  const renderBonusCard = () => {
    if (!bonusConfig || (isAdmin && !selectedUserId)) return null;
    const goal = bonusConfig.reservations_required;
    const progress = userReservationCount % goal;
    const hasDiscount = userReservationCount > 0 && progress === 0;
    const remaining = hasDiscount ? 0 : goal - progress;
    const progressPercent = (progress / goal) * 100;
    return (
      <div className={`p-3 rounded-xl border ${appliedDiscount > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2">
          <Gift className={`w-4 h-4 shrink-0 ${appliedDiscount > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div className="flex-1 min-w-0">
            {hasDiscount ? (
              <p className="text-xs font-bold text-emerald-700">
                ¡Bonificación aplicada! {bonusConfig.discount_percentage}% de descuento
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                Te faltan {remaining} {terminology.reservationLabel}{remaining !== 1 ? 's' : ''} para obtener {bonusConfig.discount_percentage}% OFF
              </p>
            )}
            <div className="mt-1.5 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${appliedDiscount > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEditing ? `Editar ${terminology.reservationLabel}` : `Nueva ${terminology.reservationLabel}`}
          </h1>
          <p className="text-gray-500 text-sm">Agenda tu sesión con nuestro personal profesional.</p>
        </div>

        <div className="w-full max-w-xl">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center gap-1 md:gap-2">
              <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0", step === 1 ? "bg-primary text-white" : step > 1 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-700 hidden sm:inline">{terminology.areaLabel}</span>
            </div>
            {!isResidential && (
              <>
            <div className={cn("flex-1 h-0.5 mx-0.5 md:mx-1", step > 1 ? "bg-emerald-500" : "bg-gray-200")} />
            <div className="flex items-center gap-1 md:gap-2">
              <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0", step === 2 ? "bg-primary text-white" : step > 2 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
                {step > 2 ? "✓" : "2"}
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-700 hidden sm:inline">Servicio</span>
            </div>
              </>
            )}
            <div className={cn("flex-1 h-0.5 mx-0.5 md:mx-1", step > (isResidential ? 1 : 2) ? "bg-emerald-500" : "bg-gray-200")} />
            <div className="flex items-center gap-1 md:gap-2">
              <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0", step === (isResidential ? 2 : 3) ? "bg-primary text-white" : step > (isResidential ? 2 : 3) ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
                {step > (isResidential ? 2 : 3) ? "✓" : isResidential ? "2" : "3"}
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-700 hidden sm:inline">Horario</span>
            </div>
            <div className={cn("flex-1 h-0.5 mx-0.5 md:mx-1", step > (isResidential ? 2 : 3) ? "bg-emerald-500" : "bg-gray-200")} />
            <div className="flex items-center gap-1 md:gap-2">
              <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0", step === (isResidential ? 3 : 4) ? "bg-primary text-white" : "bg-gray-200 text-gray-500")}>
                {isResidential ? "3" : "4"}
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-700 hidden sm:inline">Confirmar</span>
            </div>
          </div>
        </div>
      </div>

      {/* GUEST MODAL */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="border-none shadow-2xl bg-white rounded-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <CardHeader className="text-center pt-8 pb-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl font-black">Estás ingresando como invitado</CardTitle>
              <CardDescription className="text-sm mt-2">
                Al registrarte podrás hacer seguimiento de tus citas, acumular bonificaciones y mucho más.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-3">
              <Button
                onClick={() => { setShowGuestModal(false); openAuthModal('register'); }}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Registrarme
              </Button>
              <Button
                onClick={() => { setShowGuestModal(false); openAuthModal('login'); }}
                variant="outline"
                className="w-full h-12 font-bold rounded-xl border-gray-200"
              >
                <LogIn className="w-4 h-4 mr-2" /> Iniciar Sesión
              </Button>
              <Button
                onClick={handleContinueAsGuest}
                variant="ghost"
                className="w-full h-12 font-bold rounded-xl text-gray-500"
              >
                Continuar como invitado <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 1: Select Professional */}
      {step === 1 && (
        <>
          {isAdmin && (
            <Card className="mb-4 border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-gray-900">Reservar para Usuario</CardTitle>
                <CardDescription>Selecciona el cliente para esta cita</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => { setSelectedUserId(e.target.value); setUserError(null); }}
                  className={cn("w-full p-2.5 border rounded-lg bg-white text-gray-900 text-sm", selectedUserId ? "border-green-200 bg-green-50/50" : "border-gray-200")}
                >
                  <option value="">Seleccionar cliente...</option>
                  {filteredUsers.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} {user.apartment ? `- Apto ${user.apartment}` : ''}
                    </option>
                  ))}
                </select>
                {userError && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{userError}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className={cn("grid gap-4", isResidential ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
            {areasData.map((employee: any) => (
              isResidential ? (
                <Card
                  key={employee.id}
                  className="border-none apple-shadow bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:apple-shadow-hover flex flex-col"
                  onClick={() => handleEmployeeClick(employee)}
                >
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    {employee.image_url ? (
                      <img src={employee.image_url} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center"><Building2 className="w-10 h-10 text-primary/20" /></div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{employee.name}</h3>
                    {employee.description && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{employee.description}</p>}
                    <div className="mt-2 text-[10px] font-medium text-gray-400">
                      {employee.is_free ? 'Gratuito' : employee.pricing_type === 'hourly' ? `${formatCurrency(employee.cost_per_hour)}/hora · Máx ${employee.max_hours_per_reservation}h` : employee.pricing_type === 'jornada' ? `Jornada desde ${formatCurrency(employee.cost_jornada_diurna)}` : `${formatCurrency(employee.fixed_cost)} fijo · ${employee.estimated_duration_minutes}min`}
                    </div>
                    <Button className="w-full h-8 mt-3 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary hover:text-white border-none shadow-none">
                      Seleccionar
                    </Button>
                  </div>
                </Card>
              ) : (
              <Card
                key={employee.id}
                className="border-none apple-shadow bg-white rounded-2xl text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:apple-shadow-hover flex flex-col overflow-hidden"
                onClick={() => handleEmployeeClick(employee)}
              >
                {employee.image_url && (
                  <div className="w-full h-32 bg-gray-100 -mb-10 relative shrink-0">
                    <img src={employee.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
                  </div>
                )}
                <div className={cn("p-4 flex flex-col items-center flex-1", employee.image_url ? "relative z-10 pt-0" : "")}>
                  <div className={cn("w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-sm", employee.image_url ? "-mt-10 mb-2" : "mx-auto mb-3")}>
                    {employee.employee_photo_url ? (
                      <img src={employee.employee_photo_url} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1 truncate">{employee.name}</h3>
                  <p className="text-[11px] text-gray-500 mb-3 truncate">{employee.specialty || 'Profesional de servicios'}</p>
                  <Button className="w-full h-8 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary hover:text-white border-none shadow-none mt-auto">
                    Seleccionar
                  </Button>
                </div>
              </Card>
              )
            ))}
          </div>
        </>
      )}

      {/* STEP 2: Select Service (single-select, click to advance) */}
      {step === 2 && selectedArea && (
        <Card className="border-none apple-shadow bg-white rounded-2xl max-w-3xl mx-auto overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-gray-50">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setStep(1)}><ChevronLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle className="text-lg font-bold">Servicios de {selectedArea.name}</CardTitle>
              <CardDescription>Selecciona el servicio que deseas</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Cargando servicios...</div>
            ) : availableServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className="p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/30 hover:bg-primary/5 hover:shadow-md transition-all duration-300 text-left flex flex-col gap-3 group"
                  >
                    {service.image_url && (
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                        <img src={service.image_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-sm font-bold text-gray-900">{service.name}</span>
                        <span className="text-sm font-black text-primary shrink-0">{formatCurrency(service.cost)}</span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                      )}
                      <span className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{service.duration} min
                      </span>
                      {(() => {
                        const bonus = getBonusForService(service.id);
                        if (!bonus) return null;
                        const { goal, discountPct, count } = bonus;
                        const progress = count % goal;
                        const hasDiscount = count > 0 && progress === 0;
                        const remaining = hasDiscount ? 0 : goal - progress;
                        return (
                          <div className={`mt-2 text-[10px] font-semibold flex items-center gap-1 ${hasDiscount ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <Gift className="w-3 h-3" />
                            {hasDiscount ? (
                              <>{discountPct}% OFF aplicado</>
                            ) : (
                              <>Faltan {remaining} {terminology.reservationLabel}{remaining !== 1 ? 's' : ''} para {discountPct}% OFF</>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end">
                      <span className="text-[10px] font-bold text-primary/60 group-hover:text-primary flex items-center gap-1 transition-colors">
                        Seleccionar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Este profesional no tiene servicios vinculados actualmente.</p>
            )}
            {renderBonusCard()}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Schedule + Add-ons */}
      {step === 3 && selectedArea && (selectedService || isResidential) && (
        <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-gray-50">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleGoBackFromSchedule}><ChevronLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle className="text-lg font-bold">Seleccionar Horario</CardTitle>
              <CardDescription>
                {isResidential 
                  ? `${selectedArea.name}`
                  : `${selectedService?.name || ''} (${mainDuration} min)${addonsDuration > 0 ? ` + ${addonsDuration} min extra` : ''}`
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Add-ons section - only for non-residential */}
            {!isResidential && availableAddons.length > 0 && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <Label className="text-xs font-bold text-gray-700 uppercase">Servicios Adicionales</Label>
                <div className="space-y-2">
                  {availableAddons.map((addon) => {
                    const isChecked = selectedAddons.some(a => a.id === addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => toggleAddonSelection(addon)}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all",
                          isChecked ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-md flex items-center justify-center border transition-colors", isChecked ? "bg-primary border-primary text-white" : "border-gray-300")}>
                          {isChecked && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-900">{addon.name}</span>
                            <span className="text-xs font-bold text-primary">+{formatCurrency(addon.additional_cost)}</span>
                          </div>
                          {addon.description && <p className="text-[10px] text-gray-400 truncate">{addon.description}</p>}
                          {addon.additional_duration_minutes > 0 && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />+{addon.additional_duration_minutes} min</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="space-y-4">
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4 rotate-180" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => <div key={idx}>{day}</div>)}
                    {Array.from({ length: firstDayOfMonth }).map((_, idx) => <div key={idx} />)}
                    {getDaysInMonth().map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isSelected = dateStr === selectedDate;
                      const isPast = day < new Date() && !isToday(day);
                      const notInSchedule = !isDateWithinOperationSchedule(dateStr);
                      const isBeyondLimit = maxReservationDays ? day > new Date(new Date().getTime() + maxReservationDays * 24 * 60 * 60 * 1000) : false;

                      return (
                        <button
                          key={dateStr}
                          disabled={isPast || notInSchedule || isBeyondLimit}
                          onClick={() => handleDateChange(dateStr)}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors mx-auto",
                            isSelected && "bg-primary text-white shadow-md shadow-primary/20",
                            !isSelected && !isPast && !notInSchedule && !isBeyondLimit && "hover:bg-gray-100",
                            (isPast || notInSchedule || isBeyondLimit) && "text-gray-300 cursor-not-allowed",
                            isToday(day) && !isSelected && "ring-1 ring-primary text-primary"
                          )}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time slots */}
              <div className="space-y-4">
                {isResidential && selectedArea?.pricing_type === 'jornada' && !selectedArea?.is_free ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Seleccionar Jornada</Label>
                    {[
                      { key: 'diurna', label: 'Diurna', time: `${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_diurna || '18:00'}`, cost: selectedArea.cost_jornada_diurna },
                      { key: 'nocturna', label: 'Nocturna', time: `${selectedArea.jornada_start_nocturna || '18:00'} - ${selectedArea.jornada_end_nocturna || '23:59'}`, cost: selectedArea.cost_jornada_nocturna },
                      { key: 'ambos', label: 'Completa (Día + Noche)', time: `${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_nocturna || '23:59'}`, cost: selectedArea.cost_jornada_ambos },
                    ].map(j => (
                      <button key={j.key} onClick={() => { setSelectedJornada(j.key); setSelectedStartTime(j.key); }} className={cn("w-full p-4 rounded-xl border text-left transition-all", selectedJornada === j.key ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" : "bg-white border-gray-200 hover:border-gray-300")}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900">{j.label}</span>
                            <p className="text-xs text-gray-500 mt-0.5">{j.time}</p>
                          </div>
                          <span className="font-black text-primary text-lg">{formatCurrency(j.cost)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : isResidential && selectedArea?.pricing_type === 'hourly' && !selectedArea?.is_free ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-700">Seleccionar Horas ({selectedDate})</Label>
                      <span className="text-xs text-gray-400">{selectedHourSlots.length > 0 ? `${selectedHourSlots.length}h seleccionadas` : 'Sin selección'}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1">
                      {getAllHalfHourSlots().map((time) => {
                        const isSelected = selectedHourSlots.includes(time);
                        const slotStart = parseISO(`${selectedDate}T${time}:00`);
                        const isPast = slotStart < new Date();
                        const isReserved = existingReservations.some(res => {
                          const rs = parseISO(detoxTime(res.start_datetime));
                          const re = parseISO(detoxTime(res.end_datetime));
                          return slotStart >= rs && slotStart < re;
                        });
                        const reservedBy = existingReservations.find(res => {
                          const rs = parseISO(detoxTime(res.start_datetime));
                          const re = parseISO(detoxTime(res.end_datetime));
                          return slotStart >= rs && slotStart < re;
                        });
                        const reservedName = reservedBy ? (reservedBy.guest_name || reservedBy.profiles?.full_name || 'Reservado') : '';
                        const maxSlots = selectedArea?.max_hours_per_reservation || 4;
                        const canSelect = !isPast && !isReserved && (isSelected || selectedHourSlots.length < maxSlots);
                        return (
                          <button
                            key={time}
                            disabled={!canSelect}
                            onClick={() => { if (canSelect) toggleHourSlot(time); }}
                            title={isReserved ? reservedName : undefined}
                            className={cn(
                              "h-9 rounded-lg text-[10px] font-bold transition-all",
                              isSelected && "bg-primary text-white shadow-sm",
                              !isSelected && !isPast && !isReserved && "bg-white border border-gray-200 text-gray-600 hover:border-primary/50 hover:bg-primary/5",
                              (isPast || isReserved) && "bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed"
                            )}
                          >
                            {formatTime(time)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 self-center mr-1">Selección rápida:</span>
                      {Array.from({ length: selectedArea?.max_hours_per_reservation || 4 }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => quickSelectHours(n)} className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all", selectedHourSlots.length === n ? "bg-primary text-white border-primary" : "border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary")}>
                          {n}h
                        </button>
                      ))}
                    </div>
                    {selectedHourSlots.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-3 bg-primary/5 rounded-xl">
                        {selectedHourSlots.map((t, i) => (
                          <span key={t} className="px-2 py-1 bg-primary text-white rounded-lg text-[10px] font-bold">
                            {formatTime(t)}{i < selectedHourSlots.length - 1 ? ' →' : ''}
                          </span>
                        ))}
                        <span className="ml-auto text-xs font-bold text-primary self-center">
                          {selectedHourSlots.length}h · {formatCurrency(selectedHourSlots.length * (selectedArea?.cost_per_hour || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                <Label className="text-sm font-semibold text-gray-700">Horas Disponibles ({selectedDate})</Label>
                <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                  {getFixedTimeSlots().map((time) => {
                    const info = getSlotStatus(time);
                    const isOccupied = info.status !== 'available';
                    const startSlot = parseISO(`${selectedDate}T${time}:00`);
                    const endRange = selectedStartTime ? addMinutes(parseISO(`${selectedDate}T${getActualStartTimeStr()}:00`), totalSelectedDuration) : null;
                    const isInRange = selectedStartTime && startSlot >= parseISO(`${selectedDate}T${getActualStartTimeStr()}:00`) && startSlot < endRange!;

                    return (
                      <div key={time} className="group" title={isOccupied && info.status === 'reserved' && info.conflicts ? info.conflicts.map((c: any) => `${c.userName}${c.userPhone ? ` (${c.userPhone})` : ''}`).join('\n') : undefined}>
                      <Button
                        variant="outline"
                        disabled={isOccupied || (!selectedStartTime && false)}
                        onClick={() => setSelectedStartTime(time)}
                        className={cn(
                          "h-10 text-xs font-semibold rounded-xl transition-all w-full",
                          selectedStartTime === time ? "bg-primary text-white border-none scale-105 ring-2 ring-primary/30" : 
                          isInRange ? "bg-primary/20 text-primary border-primary/30" :
                          "border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
                          isOccupied && "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50"
                        )}
                      >
                        {formatTime(time)}
                      </Button>
                      </div>
                    );
                  })}
                </div>
                </>
                )}

                <div className="pt-4 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400">
                      {isResidential && selectedHourSlots.length > 0
                        ? `${formatTime(selectedHourSlots[0])} - ${formatTime(format(addMinutes(parseISO(`${selectedDate}T${selectedHourSlots[selectedHourSlots.length - 1]}:00`), 60), 'HH:mm'))}`
                        : `Inicio`
                      }
                    </span>
                    <p className="text-xs md:text-sm font-bold text-gray-800 truncate">
                      {isResidential && selectedArea?.pricing_type === 'jornada' ? (selectedJornada === 'diurna' ? 'Jornada Diurna' : selectedJornada === 'nocturna' ? 'Jornada Nocturna' : 'Jornada Completa') :
                       isResidential && selectedHourSlots.length > 0 ? `${selectedHourSlots.length}h (${formatCurrency(selectedHourSlots.length * (selectedArea?.cost_per_hour || 0))})` :
                       selectedStartTime ? `${formatTime(getActualStartTimeStr())} - ${formatTime(format(addMinutes(parseISO(`${selectedDate}T${getActualStartTimeStr()}:00`), totalSelectedDuration || 60), 'HH:mm'))}` : 'No seleccionada'}
                    </p>
                  </div>
                  <Button
                    disabled={isResidential ? (selectedArea?.pricing_type === 'jornada' ? !selectedJornada : selectedArea?.pricing_type === 'hourly' ? selectedHourSlots.length === 0 : !selectedStartTime) : !selectedStartTime}
                    onClick={() => setStep(4)}
                    size="sm"
                    className="bg-primary text-white font-bold h-9 md:h-11 px-4 md:px-6 rounded-xl border-none shadow-none text-xs md:text-sm shrink-0"
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
            {renderBonusCard()}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Confirmation */}
      {step === 4 && selectedArea && (selectedService || isResidential) && (
        <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden max-w-md mx-auto">
          <CardHeader className="text-center pt-8 border-b border-gray-50">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-black">Resumen de tu {terminology.reservationLabel}</CardTitle>
            <CardDescription>Revisa los detalles finales antes de agendar</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                <span className="text-xs font-bold text-gray-500 uppercase">{isResidential ? terminology.areaLabel : 'Profesional'}</span>
                <span className="text-sm font-bold text-gray-800">{selectedArea.name}</span>
              </div>
              {isResidential && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                  <span className="text-xs font-bold text-gray-500 uppercase">Tipo</span>
                  <span className="text-sm font-bold text-gray-800">
                    {isResidential && selectedArea?.is_free ? 'Gratuito' : selectedArea?.pricing_type === 'hourly' ? `Por Hora (${selectedHourSlots.length}h)` : selectedArea?.pricing_type === 'jornada' ? `Jornada ${selectedJornada === 'diurna' ? 'Diurna' : selectedJornada === 'nocturna' ? 'Nocturna' : 'Completa'}` : `Precio Fijo`}
                  </span>
                </div>
              )}
              {!isResidential && selectedService && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                  <span className="text-xs font-bold text-gray-500 uppercase">Servicio</span>
                  <span className="text-sm font-bold text-gray-800">{selectedService.name} ({mainDuration} min)</span>
                </div>
              )}
              {!isResidential && selectedAddons.length > 0 && (
                <div className="py-1.5 border-b border-gray-200/50">
                  <span className="text-xs font-bold text-gray-500 uppercase">Adicionales</span>
                  {selectedAddons.map(a => (
                    <div key={a.id} className="flex justify-between items-center text-xs mt-1">
                      <span className="text-gray-600">{a.name}{a.additional_duration_minutes > 0 ? ` (+${a.additional_duration_minutes} min)` : ''}</span>
                      <span className="font-bold text-gray-800">+{formatCurrency(a.additional_cost)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                <span className="text-xs font-bold text-gray-500 uppercase">Fecha</span>
                <span className="text-sm font-bold text-gray-800">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase">Horario</span>
                <span className="text-sm font-bold text-gray-800">
                  {isResidential && selectedArea?.pricing_type === 'jornada'
                    ? (selectedJornada === 'diurna' ? `${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_diurna || '18:00'}` : selectedJornada === 'nocturna' ? `${selectedArea.jornada_start_nocturna || '18:00'} - ${selectedArea.jornada_end_nocturna || '23:59'}` : `${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_nocturna || '23:59'}`)
                    : isResidential && selectedHourSlots.length > 0
                    ? `${formatTime(selectedHourSlots[0])} - ${formatTime(format(addMinutes(parseISO(`${selectedDate}T${selectedHourSlots[selectedHourSlots.length - 1]}:00`), 30), 'HH:mm'))}`
                    : `${formatTime(selectedStartTime)} - ${formatTime(format(addMinutes(parseISO(`${selectedDate}T${selectedStartTime}:00`), totalSelectedDuration), 'HH:mm'))}`
                  }
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              {appliedDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Subtotal</span>
                  <span className="text-xs text-gray-500">{formatCurrency(totalSelectedCost)}</span>
                </div>
              )}
              {appliedDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-600 font-medium">Descuento ({appliedDiscount}%)</span>
                  <span className="text-xs text-emerald-600 font-medium">-{formatCurrency(totalSelectedCost * appliedDiscount / 100)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <span className="text-sm font-black text-gray-900 uppercase">Total</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(calculateTotalCost())}</span>
              </div>
            </div>

            {renderBonusCard()}

            {isAdmin && selectedUserId ? (
              <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <Label className="text-xs font-bold text-emerald-700 uppercase">Cliente seleccionado</Label>
                {(() => {
                  const selectedUser = users.find((u: any) => u.id === selectedUserId);
                  return selectedUser ? (
                    <div className="text-sm space-y-0.5">
                      <p className="font-bold text-gray-900">{selectedUser.full_name || 'Sin nombre'}</p>
                      {selectedUser.email && <p className="text-gray-500">{selectedUser.email}</p>}
                      {selectedUser.phone && <p className="text-gray-500">{selectedUser.phone}</p>}
                      {selectedUser.apartment && <p className="text-gray-500">Apto {selectedUser.apartment}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Cargando datos del cliente...</p>
                  );
                })()}
              </div>
            ) : isGuestUser ? (
              <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Label className="text-xs font-bold text-primary uppercase">Datos de Contacto</Label>
                <Input placeholder="Nombre completo" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-10 text-sm bg-white" />
                <Input placeholder="Teléfono / WhatsApp" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-10 text-sm bg-white" />
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0 border-t border-gray-50">
            <Button
              className="w-full bg-primary text-white font-black text-lg h-12 rounded-xl border-none shadow-none"
              onClick={handleReserve}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Confirmar {terminology.reservationLabel}
            </Button>
            <Button variant="ghost" className="w-full text-gray-500 font-bold h-9 text-xs" onClick={() => setStep(3)}>
              Modificar horario
            </Button>
          </CardFooter>
        </Card>
      )}

      <AlertDialog
        open={isErrorAlertOpen}
        onOpenChange={setIsErrorAlertOpen}
        title="Error al agendar cita"
        description={errorMessage}
        confirmText="Aceptar"
        showCancel={false}
        onConfirm={() => setIsErrorAlertOpen(false)}
        variant="destructive"
      />
    </div>
  );
}
