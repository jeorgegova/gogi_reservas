import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useCommonAreasQuery } from '@/hooks/useResources';
import { useCreateReservationMutation, useUpdateReservationMutation } from '@/hooks/useReservations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Calendar as CalendarIcon,
  Users,
  Search,
  HelpCircle,
  Gift,
  Package,
  X,
  MapPin,
  Phone,
  User
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
}

export default function NewReservationPage() {
  const { profile, terminology, openAuthModal, businessType } = useAuth();
  const queryClient = useQueryClient();
  const { status: subscriptionStatus, daysUntilExpiry, loading: subscriptionLoading, previousSubscriptionExpiredBeyond20Days } = useSubscriptionStatus(profile?.organization_id);
  const navigate = useNavigate();
  const { id } = useParams();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState<any>(null); // selectedEmployee
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  
  // New architecture fields: list of services linking to employee
  const [availableServices, setAvailableServices] = useState<CustomService[]>([]);
  const [selectedServices, setSelectedServices] = useState<CustomService[]>([]);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);
  const [activeMaintenances, setActiveMaintenances] = useState<any[]>([]);

  // Admin user selection
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

  const [operationSchedules, setOperationSchedules] = useState<any[]>([]);
  const [maxReservationDays, setMaxReservationDays] = useState<number | null>(null);

  // Queries
  const { data: areasData = [] } = useCommonAreasQuery(profile?.organization_id);
  const createMutation = useCreateReservationMutation();
  const updateMutation = useUpdateReservationMutation();

  const fallbackSlots = Array.from({ length: 28 }, (_, i) => {
    const hour = Math.floor(8 + i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  const getNextBlockStart = (startTime: string): Date | null => {
    if (!startTime) return null;
    const start = parseISO(`${selectedDate} ${startTime}:00`);
    let earliestBlock: Date | null = null;

    for (const res of existingReservations) {
      const resStart = parseISO(detoxTime(res.start_datetime));
      if (resStart > start) {
        if (!earliestBlock || resStart < earliestBlock) {
          earliestBlock = resStart;
        }
      }
    }

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
  });

  const hasPendingReservation = pendingReservations.length > 0;

  const { data: users = [] } = useQuery({
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

      return (data || []).map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
        email: m.profiles.email,
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
      
      // Load services linked to edit
      fetchLinkedServicesForEdit(reservationToEdit.resources.id, reservationToEdit.reservation_services);
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
        }));
      setAvailableServices(mapped);
      
      const savedIds = savedServices.map(s => s.service_id);
      const selected = mapped.filter(m => savedIds.includes(m.id));
      setSelectedServices(selected);
    }
  };

  const blockingError = (() => {
    if (subscriptionStatus === 'cancelled') return 'Tu suscripción ha sido cancelada. Contacta al administrador para reactivar tu cuenta.';
    if (subscriptionStatus === 'inactive' || (subscriptionStatus === 'past_due' && daysUntilExpiry !== undefined && daysUntilExpiry < -20) || (subscriptionStatus === 'past_due' && previousSubscriptionExpiredBeyond20Days)) return 'Servicio temporalmente inhabilitado. Si tienes dudas por favor comunícate con administración.';

    if (isEditing && reservationToEdit) {
      if (reservationToEdit.user_id !== profile?.id && !isAdmin) return `No tienes permiso para editar esta reserva.`;
      if (reservationToEdit.status !== 'pending_validation' && !isAdmin) return `La reserva ya se validó y no se puede editar.`;
    }

    if (!isAdmin && !isEditing && hasPendingReservation && !isGuestUser) {
      return `Tienes una reserva pendiente de pago o validación. Debes completar el pago o esperar aprobación antes de hacer una nueva.`;
    }

    if (isGuestUser && isEditing) {
      return `Como invitado no puedes editar reservas. Por favor inicia sesión para gestionar tus citas.`;
    }

    return null;
  })();

  const totalSelectedDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalSelectedCost = selectedServices.reduce((sum, s) => sum + s.cost, 0);

  // Auto adjustment and validation for proposed time slots
  useEffect(() => {
    if (selectedStartTime && selectedArea && totalSelectedDuration > 0) {
      const nextBlock = getNextBlockStart(selectedStartTime);
      const start = parseISO(`${selectedDate} ${selectedStartTime}:00`);
      
      if (nextBlock && totalSelectedDuration > (nextBlock.getTime() - start.getTime()) / (1000 * 60)) {
        setSelectedStartTime('');
        setErrorMessage('La duración acumulada de los servicios seleccionados excede el tiempo disponible antes de la próxima reserva.');
        setIsErrorAlertOpen(true);
      }
    }
  }, [selectedStartTime, selectedArea, selectedServices, existingReservations, activeMaintenances]);

  const filteredUsers = (users || []).filter((user: any) =>
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (terminology.unitLabel && user.apartment?.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

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

  const handleEmployeeSelect = async (employee: any) => {
    if (isAdmin && !selectedUserId) {
      setUserError('Por favor selecciona un usuario antes de continuar.');
      return;
    }

    setUserError(null);
    setSelectedArea(employee);
    setSelectedServices([]);
    setSelectedStartTime('');
    
    // Step 2: Fetch services linked to this employee
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
          }));
        setAvailableServices(mapped);
      }
    } catch (e: any) {
      toast.error('Error al cargar servicios del empleado: ' + e.message);
    } finally {
      setLoading(false);
    }

    fetchBusySlots(employee.id);
    fetchBonusInfo(employee.id);
    fetchOperationSchedules();

    if (isGuestUser) {
      setShowPromoModal(true);
    } else {
      setStep(2);
    }
  };

  const fetchBonusInfo = async (employeeId: string) => {
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
        .eq('common_area_id', employeeId)
        .eq('is_active', true)
        .single();

      setBonusConfig(config);

      if (config) {
        const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : profile.id;
        const { count } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', targetUserId)
          .eq('resource_id', employeeId)
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

  useEffect(() => {
    if (bonusConfig) {
      const cycleLength = bonusConfig.reservations_required + 1;
      const progressInCycle = userReservationCount % cycleLength;
      setAppliedDiscount(progressInCycle === bonusConfig.reservations_required ? bonusConfig.discount_percentage : 0);
    } else {
      setAppliedDiscount(0);
    }
  }, [bonusConfig, userReservationCount]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedArea) {
      fetchBusySlots(selectedArea.id);
    }
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
    if (appliedDiscount > 0) {
      return totalSelectedCost * (1 - appliedDiscount / 100);
    }
    return totalSelectedCost;
  };

  const getEndTime = () => {
    if (!selectedArea || !selectedStartTime) return '';
    return format(addMinutes(parseISO(`${selectedDate}T${selectedStartTime}:00`), totalSelectedDuration), "yyyy-MM-dd'T'HH:mm:ss");
  };

  const toggleServiceSelection = (service: CustomService) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const handleReserve = async () => {
    if (!profile || !selectedArea || !selectedStartTime || selectedServices.length === 0) return;

    if (isGuestUser && (!guestName || !guestPhone)) {
      setErrorMessage('Por favor ingresa tu nombre y teléfono de contacto');
      setIsErrorAlertOpen(true);
      return;
    }

    if (isGuestUser && guestPhone) {
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('guest_phone', guestPhone)
        .in('status', ['pending_payment', 'pending_validation']);

      if (count && count > 0) {
        setErrorMessage(`Ya existe una reserva pendiente de validación asociada a tu teléfono. Espera a que sea procesada.`);
        setIsErrorAlertOpen(true);
        return;
      }
    }

    setErrorMessage('');

    const info = getSlotStatus(selectedStartTime);
    if (info.status !== 'available' && !(isAdmin && info.status === 'reserved')) {
      setErrorMessage(`El horario seleccionado ya no está disponible.`);
      setIsErrorAlertOpen(true);
      return;
    }

    const start = `${selectedDate}T${selectedStartTime}:00`;
    const end = getEndTime();
    const totalCost = calculateTotalCost();

    if (isAdmin && !selectedUserId) {
      setErrorMessage(`Por favor selecciona un usuario para registrar la reserva.`);
      setIsErrorAlertOpen(true);
      return;
    }

    const reservationUserId = (isAdmin && selectedUserId) ? selectedUserId : profile.id;

    const reservationData: any = {
      user_id: reservationUserId,
      resource_id: selectedArea.id,
      start_datetime: start,
      end_datetime: end,
      total_cost: totalCost,
      organization_id: profile?.organization_id,
      status: 'pending_validation',
      guest_name: isGuestUser ? guestName : null,
      guest_phone: isGuestUser ? guestPhone : null
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: reservationData });
        await supabase.from('reservation_services').delete().eq('reservation_id', id);
        
        const serviceInserts = selectedServices.map(service => ({
          reservation_id: id,
          service_id: service.id,
          charged_price: service.cost
        }));
        await supabase.from('reservation_services').insert(serviceInserts);
      } else {
        const result = await createMutation.mutateAsync(reservationData);
        if (result?.id) {
          const serviceInserts = selectedServices.map(service => ({
            reservation_id: result.id,
            service_id: service.id,
            charged_price: service.cost
          }));
          await supabase.from('reservation_services').insert(serviceInserts);
        }
      }

      const targetPath = isGuestUser
        ? `/${profile?.organization_slug}`
        : (isAdmin ? '/admin/reservations' : '/reservations/my');

      navigate(targetPath);
      toast.success(isEditing ? 'Reserva actualizada con éxito' : 'Reserva creada con éxito');
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
          <CardTitle className="text-xl mb-4">Servicio temporalmente inhabilitado</CardTitle>
          <CardDescription className="text-base mb-6">{blockingError}</CardDescription>
          <Button onClick={() => navigate('/reservations/my')}>Ver mis reservas</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEditing ? 'Editar Cita' : 'Nueva Reserva'}
          </h1>
          <p className="text-gray-500 text-sm">Agenda tu sesión con nuestro personal profesional.</p>
        </div>
        
        {/* Progress Bar steps */}
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", step === 1 ? "bg-primary text-white" : step > 1 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="text-xs font-medium text-gray-700">Profesional</span>
            </div>
            <div className={cn("flex-1 h-0.5 mx-1", step > 1 ? "bg-emerald-500" : "bg-gray-200")} />
            
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", step === 2 ? "bg-primary text-white" : step > 2 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
                {step > 2 ? "✓" : "2"}
              </div>
              <span className="text-xs font-medium text-gray-700">Servicios</span>
            </div>
            <div className={cn("flex-1 h-0.5 mx-1", step > 2 ? "bg-emerald-500" : "bg-gray-200")} />

            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", step === 3 ? "bg-primary text-white" : step > 3 ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
                {step > 3 ? "✓" : "3"}
              </div>
              <span className="text-xs font-medium text-gray-700">Horario</span>
            </div>
            <div className={cn("flex-1 h-0.5 mx-1", step > 3 ? "bg-emerald-500" : "bg-gray-200")} />

            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", step === 4 ? "bg-primary text-white" : "bg-gray-200 text-gray-500")}>
                4
              </div>
              <span className="text-xs font-medium text-gray-700">Confirmar</span>
            </div>
          </div>
        </div>
      </div>

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
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setUserError(null);
                  }}
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {areasData.map((employee: any) => (
              <Card
                key={employee.id}
                className="border-none apple-shadow bg-white rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:apple-shadow-hover flex flex-col justify-between"
                onClick={() => handleEmployeeSelect(employee)}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-2 border-gray-100 shadow-sm">
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
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 2 && selectedArea && (
        <Card className="border-none apple-shadow bg-white rounded-2xl max-w-xl mx-auto overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-gray-50">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setStep(1)}><ChevronLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle className="text-lg font-bold">Servicios de {selectedArea.name}</CardTitle>
              <CardDescription>Selecciona los servicios que deseas para tu cita</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {availableServices.length > 0 ? (
              <div className="space-y-2">
                {availableServices.map((service) => {
                  const isChecked = selectedServices.some(s => s.id === service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleServiceSelection(service)}
                      className={cn(
                        "w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-all",
                        isChecked ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" : "bg-white border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center border transition-colors", isChecked ? "bg-primary border-primary text-white" : "border-gray-300")}>
                        {isChecked && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 truncate">{service.name}</span>
                          <span className="text-sm font-bold text-primary">{formatCurrency(service.cost)}</span>
                        </div>
                        {service.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{service.description}</p>
                        )}
                        <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{service.duration} min</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Este empleado no tiene servicios vinculados actualmente.</p>
            )}

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total seleccionado</p>
                <p className="text-lg font-black text-gray-900">{formatCurrency(totalSelectedCost)} ({totalSelectedDuration} min)</p>
              </div>
              <Button
                disabled={selectedServices.length === 0}
                onClick={() => setStep(3)}
                className="bg-primary text-white font-bold h-11 px-5 rounded-xl border-none shadow-none"
              >
                Continuar Horario <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedArea && (
        <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-gray-50">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setStep(2)}><ChevronLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle className="text-lg font-bold">Seleccionar Horario</CardTitle>
              <CardDescription>Para {selectedServices.map(s => s.name).join(', ')} ({totalSelectedDuration} min)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calendario */}
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

              {/* Horas */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-700">Horas Disponibles ({selectedDate})</Label>
                <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                  {getFixedTimeSlots().map((time) => {
                    const info = getSlotStatus(time);
                    const isOccupied = info.status !== 'available' && !(isAdmin && info.status === 'reserved');

                    return (
                      <Button
                        key={time}
                        variant="outline"
                        disabled={isOccupied}
                        onClick={() => setSelectedStartTime(time)}
                        className={cn(
                          "h-10 text-xs font-semibold rounded-xl",
                          selectedStartTime === time ? "bg-primary text-white border-none scale-105" : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
                          isOccupied && "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50"
                        )}
                      >
                        {formatTime(time)}
                      </Button>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-400">Inicio de cita</span>
                    <p className="text-sm font-bold text-gray-800">{selectedStartTime ? formatTime(selectedStartTime) : 'No seleccionada'}</p>
                  </div>
                  <Button
                    disabled={!selectedStartTime}
                    onClick={() => setStep(4)}
                    className="bg-primary text-white font-bold h-11 px-6 rounded-xl border-none shadow-none"
                  >
                    Confirmar Reserva
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && selectedArea && (
        <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden max-w-md mx-auto">
          <CardHeader className="text-center pt-8 border-b border-gray-50">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-black">Resumen de tu Cita</CardTitle>
            <CardDescription>Revisa los detalles finales antes de agendar</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                <span className="text-xs font-bold text-gray-500 uppercase">Profesional</span>
                <span className="text-sm font-bold text-gray-800">{selectedArea.name}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                <span className="text-xs font-bold text-gray-500 uppercase">Fecha</span>
                <span className="text-sm font-bold text-gray-800">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/50">
                <span className="text-xs font-bold text-gray-500 uppercase">Horario</span>
                <span className="text-sm font-bold text-gray-800">
                  {formatTime(selectedStartTime)} - {formatTime(format(addMinutes(parseISO(`${selectedDate}T${selectedStartTime}:00`), totalSelectedDuration), 'HH:mm'))}
                </span>
              </div>
              <div className="py-2 border-b border-gray-200/50">
                <span className="text-xs font-bold text-gray-500 uppercase">Servicios</span>
                <div className="mt-1 space-y-1.5">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{service.name} ({service.duration} min)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(service.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-gray-900 uppercase">Total</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(calculateTotalCost())}</span>
              </div>
            </div>

            {isGuestUser && (
              <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Label className="text-xs font-bold text-primary uppercase">Datos de Contacto</Label>
                <Input
                  placeholder="Nombre completo"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="h-10 text-sm bg-white"
                />
                <Input
                  placeholder="Teléfono / WhatsApp"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="h-10 text-sm bg-white"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0 border-t border-gray-50">
            <Button
              className="w-full bg-primary text-white font-black text-lg h-12 rounded-xl border-none shadow-none"
              onClick={handleReserve}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Confirmar Cita
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
