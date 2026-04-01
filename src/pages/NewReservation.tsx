import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useCommonAreasQuery } from '@/hooks/useCommonAreas';
import { useCreateReservationMutation, useUpdateReservationMutation } from '@/hooks/useReservations';
import { useQuery } from '@tanstack/react-query';
import * as reservationService from '@/services/reservations';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn, detoxTime } from '@/lib/utils';
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
  Gift
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { format, addHours, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NewReservationPage() {
  const { profile, terminology } = useAuth();
  const { status: subscriptionStatus, daysUntilExpiry, loading: subscriptionLoading, previousSubscriptionExpiredBeyond20Days } = useSubscriptionStatus(profile?.organization_id);
  const navigate = useNavigate();
  const { id } = useParams();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
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

  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [bonusConfig, setBonusConfig] = useState<any>(null);
  const [userReservationCount, setUserReservationCount] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  // React Query Hooks
  const { data: areasData = [] } = useCommonAreasQuery(profile?.organization_id);
  const createMutation = useCreateReservationMutation();
  const updateMutation = useUpdateReservationMutation();
  
  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getNextBlockStart = (startTime: string): Date | null => {

    if (!startTime) return null;
    
    const start = parseISO(`${selectedDate}T${startTime}:00`);
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

  const checkPendingReservations = async () => {
    if (!profile) return;

    let query = supabase
      .from('reservations')
      .select('id')
      .eq('user_id', profile.id)
      .eq('organization_id', profile.organization_id)
      .in('status', ['pending_payment', 'pending_validation']);

    if (isEditing && id) {
      query = query.neq('id', id);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      setBlockingError(`Tiene una ${terminology.reservationLabel.toLowerCase()} pendiente de pago o validación. Debe completar el pago o esperar aprobación antes de hacer una nueva ${terminology.reservationLabel.toLowerCase()}.`);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, apartment')
      .eq('organization_id', profile?.organization_id)
      .eq('role', 'user')
      .order('full_name');

    if (data) {
      setUsers(data);
    }
  };

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

  useEffect(() => {
    if (profile?.organization_id) {
      checkPendingReservations();
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [profile?.organization_id, isAdmin]);

  useEffect(() => {
    if (reservationToEdit && isEditing) {
      // Logic from fetchReservationToEdit
      if (reservationToEdit.user_id !== profile?.id && !isAdmin) {
        setBlockingError(`No tienes permiso para editar esta ${terminology.reservationLabel.toLowerCase()}.`);
        return;
      }
      if (reservationToEdit.status !== 'pending_validation' && !isAdmin) {
        setBlockingError(`La ${terminology.reservationLabel.toLowerCase()} ya se validó y no se puede editar.`);
        return;
      }


      setSelectedArea(reservationToEdit.common_areas);
      const startDate = parseISO(detoxTime(reservationToEdit.start_datetime));
      setSelectedDate(format(startDate, 'yyyy-MM-dd'));
      setSelectedStartTime(format(startDate, 'HH:mm'));

      const endDate = parseISO(detoxTime(reservationToEdit.end_datetime));
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      setDuration(diffHours);
      setStep(2);
    }
  }, [reservationToEdit, isEditing, profile?.id, isAdmin]);

  useEffect(() => {
    if (!subscriptionLoading) {
      if (subscriptionStatus === 'cancelled') {
        setBlockingError('Tu suscripción ha sido cancelada. Contacta al administrador para reactivar tu cuenta.');
      } else if (subscriptionStatus === 'inactive' || (subscriptionStatus === 'past_due' && daysUntilExpiry !== undefined && daysUntilExpiry < -20) || (subscriptionStatus === 'past_due' && previousSubscriptionExpiredBeyond20Days)) {
        setBlockingError('Servicio temporalmente inhabilitado. Si tienes dudas por favor comunícate con administración.');
      } else {
        setBlockingError(null);
      }
    }
  }, [subscriptionStatus, daysUntilExpiry, subscriptionLoading, previousSubscriptionExpiredBeyond20Days]);

  // Lógica de ajuste automático de duración para no exceder la medianoche o la siguiente reserva
  useEffect(() => {
    if (selectedStartTime && selectedArea?.pricing_type !== 'jornada') {
      const startHour = parseInt(selectedStartTime.split(':')[0]);
      const maxAllowedByDay = 24 - startHour;
      
      const nextBlock = getNextBlockStart(selectedStartTime) as Date | null;
      let maxAllowed = maxAllowedByDay;

      if (nextBlock) {
        const start = parseISO(`${selectedDate}T${selectedStartTime}:00`);
        const diffHours = (nextBlock.getTime() - start.getTime()) / (1000 * 60 * 60);
        maxAllowed = Math.min(maxAllowedByDay, diffHours);
      }

      if (duration > maxAllowed) {
        setDuration(maxAllowed >= 1 ? Math.floor(maxAllowed) : 1);
      }
    }
  }, [selectedStartTime, selectedArea, duration, existingReservations, activeMaintenances]);



  const filteredUsers = users.filter((user: any) =>
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.apartment?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const fetchBusySlots = async (areaId: string) => {
    let query = supabase
      .from('reservations')
      .select('start_datetime, end_datetime')
      .eq('common_area_id', areaId)
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
    setStep(2);
    fetchBusySlots(area.id);
    fetchBonusInfo(area.id);
  };

  const fetchBonusInfo = async (areaId: string) => {
    if (!profile?.id) return;

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
    const slotEnd = addHours(slotStart, duration);

    // Check reservations
    const isReserved = existingReservations.some(res => {
      const resStart = parseISO(detoxTime(res.start_datetime));
      const resEnd = parseISO(detoxTime(res.end_datetime));
      return (slotStart < resEnd && slotEnd > resStart);
    });

    if (isReserved) return { status: 'reserved' };

    // Check maintenance
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
    if (selectedArea.pricing_type === 'jornada') {
      if (selectedJornada === 'diurna') finalBaseCost = selectedArea.cost_jornada_diurna || 0;
      else if (selectedJornada === 'nocturna') finalBaseCost = selectedArea.cost_jornada_nocturna || 0;
      else if (selectedJornada === 'ambos') finalBaseCost = selectedArea.cost_jornada_ambos || 0;
    } else {
      finalBaseCost = selectedArea.cost_per_hour * duration;
    }

    if (appliedDiscount > 0) {
      return finalBaseCost * (1 - appliedDiscount / 100);
    }

    return finalBaseCost;
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

    if (selectedArea.pricing_type === 'jornada') {
      const endTime = getJornadaEndTime();
      return format(parseISO(`${selectedDate}T${endTime}:00`), "yyyy-MM-dd'T'HH:mm:ss");
    }
    return format(addHours(parseISO(`${selectedDate}T${selectedStartTime}:00`), duration), "yyyy-MM-dd'T'HH:mm:ss");
  };

  // Obtener el texto del horario para mostrar
  const getJornadaScheduleText = () => {
    if (!selectedArea) return '';
    if (selectedJornada === 'diurna') return `Diurna (${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_diurna || '18:00'})`;
    if (selectedJornada === 'nocturna') return `Nocturna (${selectedArea.jornada_start_nocturna || '18:00'} - ${selectedArea.jornada_end_nocturna || '23:59'})`;
    if (selectedJornada === 'ambos') return `Completo (${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_nocturna || '23:59'})`;
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
    const conflict = existingReservations.find(res => {
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
      return { available: false, message: `El área está en mantenimiento: ${maintenanceConflict.title}` };
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
      setBlockingError('Por favor selecciona una jornada (diurna, nocturna o completo)');
      return;
    }

    // Limpiar errores anteriores
    setBlockingError(null);

    const start = `${selectedDate}T${selectedStartTime}:00`;
    const end = getEndTime();
    const totalCost = calculateTotalCost();

    if (isAdmin && (!selectedUserId || selectedUserId.length === 0)) {
      setBlockingError(`Por favor selecciona un ${terminology.userLabel.toLowerCase()} para la ${terminology.reservationLabel.toLowerCase()}`);
      return;
    }

    const reservationUserId = (isAdmin && selectedUserId && selectedUserId.length > 0) ? selectedUserId : profile.id;
    const reservationStatus = isEditing ? 'pending_validation' : (isFree ? 'pending_validation' : 'pending_payment');

    const reservationData: Partial<reservationService.Reservation> = {
      user_id: reservationUserId,
      common_area_id: selectedArea.id,
      start_datetime: start,
      end_datetime: end,
      total_cost: totalCost,
      organization_id: profile?.organization_id,
      status: reservationStatus
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: reservationData });
      } else {
        const result = await createMutation.mutateAsync(reservationData);
        if (!isFree && result?.id) {
          navigate(`/payment/${result.id}`);
          return;
        }
      }
      navigate('/reservations/my');
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEditing ? `Editar ${terminology.reservationLabel}` : `Nueva ${terminology.reservationLabel}`}
          </h1>

          <p className="text-gray-500 text-sm">Sigue los pasos para asegurar tu espacio.</p>
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
              )}>Seleccionar área</span>
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
            users.length > 0 ? (
              <Card className="mb-6 border-primary/20 bg-primary/5">
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
                    {filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} {user.apartment ? `- Apt ${user.apartment}` : ''}
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
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">
                          Usuario seleccionado: {users.find(u => u.id === selectedUserId)?.full_name || users.find(u => u.id === selectedUserId)?.email}
                          {users.find(u => u.id === selectedUserId)?.apartment && ` - Apt ${users.find(u => u.id === selectedUserId)?.apartment}`}
                        </span>
                      </div>
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
                  <h3 className="text-sm font-bold text-amber-900 tracking-tight">Esta organización no tiene usuarios para crear reservas</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Debe registrar {terminology.userLabel.toLowerCase()}s en el módulo de usuarios antes de poder realizar {terminology.reservationLabel.toLowerCase()}s administrativas.
                  </p>
                </div>
              </div>
            )
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areasData.map((area: any) => (
              <Card
                key={area.id}
                className={cn(
                  "border-none shadow-sm bg-white transition-all overflow-hidden",
                  (isAdmin && users.length === 0) ? "opacity-75 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                )}
                onClick={() => (isAdmin && users.length === 0) ? null : handleAreaSelect(area)}
              >
                <div className="relative h-40 overflow-hidden">
                  {area.image_url ? (
                    <img src={area.image_url} alt={area.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-primary px-3 py-1 rounded-full text-xs font-bold text-white">
                    {area.is_free
                      ? 'Gratuito'
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
                    {area.pricing_type === 'jornada' ? (
                      <>
                        <Calendar className="w-3 h-3" />
                        <span>Jornada Completa</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Máx. {area.max_hours_per_reservation}h por {terminology.reservationLabel.toLowerCase()}</span>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-2">
                  <Button 
                    className="w-full"
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
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <CardTitle className="text-xl font-bold">{selectedArea.name}</CardTitle>
              <CardDescription>Configura tu horario</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
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

                        return (
                          <button
                            key={dateStr}
                            disabled={isPast}
                            onClick={() => handleDateChange(dateStr)}
                            className={cn(
                              "w-7 h-7 text-xs rounded-full flex items-center justify-center transition-colors",
                              isSelected && "bg-primary text-white",
                              !isSelected && !isPast && "hover:bg-gray-100",
                              isPast && "text-gray-300 cursor-not-allowed",
                              hasReservation && !isSelected && !isPast && "bg-amber-100 text-amber-700",
                              isToday(day) && !isSelected && "ring-1 ring-primary ring-inset"
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
                              {selectedJornada === 'diurna' && `${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_diurna || '18:00'}`}
                              {selectedJornada === 'nocturna' && `${selectedArea.jornada_start_nocturna || '18:00'} - ${selectedArea.jornada_end_nocturna || '23:59'}`}
                              {selectedJornada === 'ambos' && `${selectedArea.jornada_start_diurna || '08:00'} - ${selectedArea.jornada_end_nocturna || '23:59'}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Label className="text-sm font-medium">Duración (horas)</Label>
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
                            className="flex-1"
                            onClick={() => setDuration(h)}
                          >
                            {h}h
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {!isFree && (
                  <div className="bg-gray-50 p-4 rounded-lg relative overflow-hidden">
                    {appliedDiscount > 0 && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg animate-pulse z-10">
                        {appliedDiscount}% BONIFICACIÓN
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {selectedArea.pricing_type === 'jornada' ? (
                          <Calendar className="w-5 h-5 text-primary" />
                        ) : (
                          <Clock className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Inversión total</p>
                        <div className="flex flex-col">
                          {appliedDiscount > 0 && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(calculateTotalCost() / (1 - appliedDiscount / 100))}
                            </span>
                          )}
                          <p className="text-xl font-bold">
                            {formatCurrency(calculateTotalCost())}
                          </p>
                        </div>
                      </div>
                    </div>
                    {bonusConfig && appliedDiscount === 0 && (
                      <div className="mt-3 text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-1.5">
                        <Gift className="w-3 h-3" />
                        Progreso de bonificación: {userReservationCount % (bonusConfig.reservations_required + 1)}/{bonusConfig.reservations_required} reservas pagadas.
                      </div>
                    )}

                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">
                  {selectedArea.pricing_type === 'jornada' ? 'Jornadas disponibles' : 'Horas disponibles'}
                </Label>
                {selectedArea.pricing_type === 'jornada' ? (
                  <div className="space-y-3">
                    {/* Jornada Diurna */}
                    {(() => {
                      const startTime = selectedArea.jornada_start_diurna || '08:00';
                      const endTime = selectedArea.jornada_end_diurna || '18:00';
                      const slotStart = parseISO(`${selectedDate}T${startTime}:00`);
                      const slotEnd = parseISO(`${selectedDate}T${endTime}:00`);

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

                      const isDisabled = isReserved || !!maintenance;

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
                              "w-full h-14 justify-start gap-3",
                              selectedJornada === 'diurna' ? "bg-primary border-primary" : "border-gray-200",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Sun className="w-5 h-5" />
                            <div className="text-left flex-1">
                              <div className="font-medium">Diurna</div>
                              <div className="text-xs opacity-80">{startTime} - {endTime}</div>
                            </div>
                            <div className="ml-auto font-bold">
                              {isFree ? 'Gratis' : formatCurrency(selectedArea.cost_jornada_diurna || 0)}
                            </div>
                          </Button>

                          {isDisabled && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                              {maintenance ? `Mantenimiento: ${maintenance.title}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
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
                      const slotStart = parseISO(`${selectedDate}T${startTime}:00`);
                      const slotEnd = parseISO(`${selectedDate}T${endTime}:00`);

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

                      const isDisabled = isReserved || !!maintenance;

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
                              selectedJornada === 'nocturna' ? "bg-primary border-primary" : "border-gray-200",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Moon className="w-5 h-5" />
                            <div className="text-left flex-1">
                              <div className="font-medium">Nocturna</div>
                              <div className="text-xs opacity-80">{startTime} - {endTime}</div>
                            </div>
                            <div className="ml-auto font-bold">
                              {isFree ? 'Gratis' : formatCurrency(selectedArea.cost_jornada_nocturna || 0)}
                            </div>
                          </Button>

                          {isDisabled && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                              {maintenance ? `Mantenimiento: ${maintenance.title}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
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
                      const slotStart = parseISO(`${selectedDate}T${startTime}:00`);
                      const slotEnd = parseISO(`${selectedDate}T${endTime}:00`);

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

                      const isDisabled = isReserved || !!maintenance;

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
                              selectedJornada === 'ambos' ? "bg-primary border-primary" : "border-gray-200",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Calendar className="w-5 h-5" />
                            <div className="text-left flex-1">
                              <div className="font-medium">Completo</div>
                              <div className="text-xs opacity-80">{startTime} - {endTime}</div>
                            </div>
                            <div className="ml-auto font-bold">
                              {isFree ? 'Gratis' : formatCurrency(selectedArea.cost_jornada_ambos || 0)}
                            </div>
                          </Button>

                          {isDisabled && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                              {maintenance ? `Mantenimiento: ${maintenance.title}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Visualización del rango de horas seleccionadas */}
                    {selectedStartTime && duration > 0 && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-primary font-medium">
                          <Clock className="w-4 h-4" />
                          <span>
                            {terminology.reservationLabel} de {selectedStartTime} a {format(addHours(parseISO(`${selectedDate}T${selectedStartTime}:00`), duration), 'HH:mm')} ({duration} {duration === 1 ? 'hora' : 'horas'})
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-3">
                      {timeSlots.map((time: string) => {
                        const info = getSlotStatus(time);

                        const isOccupied = info.status !== 'available';

                        // Calcular si este horario está dentro del rango seleccionado
                        const isInRange = selectedStartTime && duration > 0 && (() => {
                          const selectedHour = parseInt(selectedStartTime.split(':')[0]);
                          const currentHour = parseInt(time.split(':')[0]);
                          return currentHour >= selectedHour && currentHour < selectedHour + duration;
                        })();

                        return (
                          <div key={time} className="relative group">
                            <Button
                              variant="outline"
                              disabled={isOccupied}
                              onClick={() => setSelectedStartTime(time)}
                              className={cn(
                                "w-full h-12 text-sm font-medium rounded-lg transition-all duration-200",
                                selectedStartTime === time
                                  ? "bg-primary text-white border-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                                  : isInRange && !isOccupied
                                    ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                                    : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
                                info.status === 'reserved' && "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed",
                                info.status === 'maintenance' && "bg-red-50 text-red-400 border-red-200 cursor-not-allowed hover:bg-red-50 hover:border-red-200"
                              )}
                            >
                              {time}
                              {info.status === 'maintenance' && (
                                <Hammer className="w-3 h-3 ml-1.5" />
                              )}
                            </Button>

                            {isOccupied && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                                {info.status === 'maintenance' ? `Mantenimiento: ${info.reason}` : `Horario con ${terminology.reservationLabel.toLowerCase()}`}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-white border border-gray-200" />
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" />
                    <span>Ocupado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                    <span>Mantenimiento</span>
                  </div>
                </div>
              </div>
            </div>

            {jornadaError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {jornadaError}
              </div>
            )}

            <div className="pt-6 border-t border-gray-100">
              <Button
                size="lg"
                className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm transition-colors"
                disabled={!selectedStartTime || (selectedArea.pricing_type === 'jornada' && !selectedJornada)}
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
                Continuar {terminology.reservationLabel.toLowerCase()} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedArea && (
        <Card className="border-none shadow-sm bg-white overflow-hidden max-w-2xl mx-auto">
          <CardHeader className="pb-4 text-center border-b">
            <ClipboardCheck className="w-8 h-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-xl font-bold">Confirmación Final</CardTitle>
            <CardDescription>Revisa los detalles antes del pago</CardDescription>
          </CardHeader>
          <CardContent className="py-4 space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500">Espacio</span>
                <span className="font-medium">{selectedArea.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500">Fecha</span>
                <span className="font-medium">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500">
                  {selectedArea.pricing_type === 'jornada' ? 'Jornada' : 'Horario'}
                </span>
                <span className="font-medium">
                  {selectedArea.pricing_type === 'jornada'
                    ? getJornadaScheduleText()
                    : `${selectedStartTime} - ${format(addHours(new Date(`${selectedDate}T${selectedStartTime}:00`), duration), 'HH:mm')}`
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500">Hora de entrada</span>
                <span className="font-medium">{selectedStartTime}</span>
              </div>
              {isEditing ? (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-amber-600 font-medium">Abono previo (en validación)</span>
                    <span className="font-medium text-amber-600">{formatCurrency(reservationToEdit?.total_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-medium">Total extra a pagar</span>
                    <span className="text-lg font-bold text-primary">
                      {(calculateTotalCost() - (reservationToEdit?.total_cost || 0)) > 0 
                        ? formatCurrency(calculateTotalCost() - (reservationToEdit?.total_cost || 0)) 
                        : formatCurrency(0)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium">{isFree ? 'Costo' : 'Total a pagar'}</span>
                  <span className="text-lg font-bold text-primary">
                    {isFree ? 'Gratis' : formatCurrency(calculateTotalCost())}
                  </span>
                </div>
              )}
            </div>

            <div className={cn(
              "border rounded-lg p-3 flex gap-3",
              isFree
                ? "bg-blue-50 border-blue-200"
                : "bg-amber-50 border-amber-200"
            )}>
              <AlertCircle className={cn(
                "w-5 h-5 shrink-0",
                isFree ? "text-blue-500" : "text-amber-500"
              )} />
              <p className="text-sm text-gray-600">
                {isEditing 
                  ? `Al confirmar edición, la ${terminology.reservationLabel.toLowerCase()} quedarán pendiente de aprobación. Si hay un excedente de cobro, un administrador validará los pagos.` 
                  : isFree
                    ? `Al confirmar, se generará la ${terminology.reservationLabel.toLowerCase()} pendiente de validación sin costo adicional.`
                    : "Al confirmar, se generará una solicitud pendiente de validación. Tienes 15 minutos para completar la transacción."
                }
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={handleReserve}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Procesando..."
                : isFree ? `Confirmar ${terminology.reservationLabel} Gratis` : "Confirmar y proceder al pago"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Modificar datos
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
    </div>
  );
}
