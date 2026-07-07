import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  XCircle,
  History as HistoryIcon,
  Pencil,
  DollarSign,
  CheckCircle2,
  Search,
  MapPin,
  Tag,
  ClipboardCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { startOfMonth, isAfter, parseISO, startOfDay, format } from 'date-fns';
import { sendReservationEmail } from '@/lib/emailService';

export default function MyReservationsPage() {
  const { profile, terminology } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));

  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const previousMapRef = useRef<Map<string, string>>(new Map());
  const highlightTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const approvedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchAreas = useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('resources')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true);
    setAreas(data || []);
  }, [profile?.organization_id]);

  const fetchReservations = useCallback(async (silent = false) => {
    if (!profile?.id || !profile?.organization_id) return;
    if (!silent) setLoading(true);

    try {
      const { data } = await supabase
        .from('reservations')
        .select(`
          *,
          resources (name, image_url)
        `)
        .eq('user_id', profile.id)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      const newReservations = data || [];
      const currentMap = new Map(newReservations.map(r => [r.id, r.status]));
      const previousMap = previousMapRef.current;
      const newlyArrived = newReservations.filter(r => !previousMap.has(r.id));
      const newlyApproved = newReservations.filter(r => {
        const prevStatus = previousMap.get(r.id);
        return prevStatus && prevStatus !== 'approved' && r.status === 'approved';
      });

      if (previousMap.size > 0 && newlyArrived.length > 0) {
        const newIds = newlyArrived.map(r => r.id);
        setHighlightedIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.add(id));
          return next;
        });

        newIds.forEach(id => {
          if (highlightTimersRef.current.has(id)) return;
          const timer = setTimeout(() => {
            setHighlightedIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            highlightTimersRef.current.delete(id);
          }, 6000);
          highlightTimersRef.current.set(id, timer);
        });

        if (newlyArrived.length === 1) {
          const r = newlyArrived[0];
          toast.info(`Nueva ${terminology.reservationLabel.toLowerCase()}`, {
            description: `${r.resources?.name || 'Recurso'} - ${formatDate(r.start_datetime)}`,
            duration: 6000,
          });
        } else {
          toast.info(`${newlyArrived.length} nuevas ${terminology.reservationLabel.toLowerCase()}s`, {
            description: 'Se han agregado a tu lista.',
            duration: 6000,
          });
        }
      }

      if (previousMap.size > 0 && newlyApproved.length > 0) {
        const approvedIdList = newlyApproved.map(r => r.id);
        setApprovedIds(prev => {
          const next = new Set(prev);
          approvedIdList.forEach(id => next.add(id));
          return next;
        });

        approvedIdList.forEach(id => {
          if (approvedTimersRef.current.has(id)) return;
          const timer = setTimeout(() => {
            setApprovedIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            approvedTimersRef.current.delete(id);
          }, 6000);
          approvedTimersRef.current.set(id, timer);
        });

        if (newlyApproved.length === 1) {
          const r = newlyApproved[0];
          toast.success(`${terminology.reservationLabel} aprobada`, {
            description: `${r.resources?.name || 'Recurso'} - ${formatDate(r.start_datetime)}`,
            duration: 6000,
          });
        } else {
          toast.success(`${newlyApproved.length} ${terminology.reservationLabel.toLowerCase()}s aprobadas`, {
            description: 'Se han aprobado tus solicitudes.',
            duration: 6000,
          });
        }
      }

      previousMapRef.current = currentMap;
      setReservations(newReservations);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservations([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [profile?.id, profile?.organization_id, terminology.reservationLabel]);

  const fetchReservationsRef = useRef(fetchReservations);
  useEffect(() => {
    fetchReservationsRef.current = fetchReservations;
  }, [fetchReservations]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchReservations();
      fetchAreas();
    }
  }, [fetchReservations, fetchAreas, profile?.organization_id]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      fetchReservationsRef.current(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [profile?.organization_id]);

  useEffect(() => {
    const timersMap = highlightTimersRef.current;
    const approvedTimersMap = approvedTimersRef.current;
    return () => {
      timersMap.forEach(timer => clearTimeout(timer));
      approvedTimersMap.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleCancelClick = (id: string) => {
    setReservationToCancel(id);
    setIsCancelAlertOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!reservationToCancel) return;

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationToCancel)
      .eq('organization_id', profile?.organization_id);

    if (!error) {
      fetchReservations();
      if (profile?.organization_id) {
        sendReservationEmail(reservationToCancel, profile.organization_id, 'cancelled');
      }
    }
    setIsCancelAlertOpen(false);
    setReservationToCancel(null);
  };

  // Lógica de filtrado y cálculo de total
  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      const matchStatus = statusFilter === 'all' || res.status === statusFilter;
      const matchArea = areaFilter === 'all' || res.resource_id === areaFilter;

      let matchDate = true;
      if (dateFilter) {
        const resDate = startOfDay(parseISO(res.start_datetime));
        const filterDate = startOfDay(parseISO(dateFilter));
        matchDate = isAfter(resDate, filterDate) || resDate.getTime() === filterDate.getTime();
      }

      return matchStatus && matchArea && matchDate;
    });
  }, [reservations, statusFilter, areaFilter, dateFilter]);

  const totalInvested = useMemo(() => {
    return filteredReservations
      .filter(res => res.status === 'approved')
      .reduce((sum, res) => sum + (res.total_cost || 0), 0);
  }, [filteredReservations]);

  const totalServices = useMemo(() => {
    return filteredReservations.filter(res => res.status === 'approved').length;
  }, [filteredReservations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header & Nueva Reserva */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            <HistoryIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mis {terminology.reservationLabel}s</h1>
            <p className="text-gray-500 text-sm">Historial y estado de tus solicitudes.</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white font-black h-12 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none">
          <Link to="/reservations/new">Nueva {terminology.reservationLabel}</Link>
        </Button>
      </div>

      {/* Indicadores Financieros */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <Card className="border-none apple-shadow rounded-2xl bg-primary/5 border-l-4 border-primary overflow-hidden group hover:apple-shadow-hover transition-all duration-300">
          <CardContent className="p-3 md:p-5 flex items-center gap-2 md:gap-0 md:justify-between">
            <div className="space-y-0.5 md:space-y-1 min-w-0">
              <p className="text-[8px] md:text-[10px] font-bold text-primary uppercase tracking-widest truncate">Total Invertido</p>
              <h3 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:scale-105 origin-left truncate">
                {formatCurrency(totalInvested)}
              </h3>
              <p className="text-[8px] md:text-[10px] text-gray-400 font-medium hidden md:block">Suma de {terminology.reservationLabel.toLowerCase()}s {terminology.reservationLabel.toLowerCase() === 'servicio' ? 'aprobados' : 'aprobadas'}</p>
            </div>
            <div className="p-2 md:p-3 bg-white rounded-lg md:rounded-xl shadow-sm group-hover:rotate-12 transition-transform shrink-0">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none apple-shadow rounded-2xl bg-blue-50/50 border-l-4 border-blue-500 overflow-hidden group hover:apple-shadow-hover transition-all duration-300">
          <CardContent className="p-3 md:p-5 flex items-center gap-2 md:gap-0 md:justify-between">
            <div className="space-y-0.5 md:space-y-1 min-w-0">
              <p className="text-[8px] md:text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate">{terminology.reservationLabel}s {terminology.reservationLabel.toLowerCase() === 'servicio' ? 'Aprobad.' : 'Aprobad.'}</p>
              <h3 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:scale-105 origin-left">
                {totalServices}
              </h3>
              <p className="text-[8px] md:text-[10px] text-gray-400 font-medium hidden md:block">{terminology.reservationLabel}s {terminology.reservationLabel.toLowerCase() === 'servicio' ? 'aprobados' : 'aprobadas'}</p>
            </div>
            <div className="p-2 md:p-3 bg-white rounded-lg md:rounded-xl shadow-sm group-hover:-rotate-12 transition-transform shrink-0">
              <ClipboardCheck className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-none apple-shadow rounded-2xl overflow-visible bg-white/80 backdrop-blur-sm sticky top-0 z-10 transition-all hover:bg-white hover:apple-shadow-hover">
        <CardContent className="p-3 md:p-5">
          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary/60" /> <span className="hidden md:inline">Fecha</span> <span className="md:hidden">Desde</span>
              </label>
              <input
                type="date"
                className="w-full h-8 md:h-10 px-1.5 md:px-3 bg-gray-50/50 border border-gray-100 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary/60" /> <span className="truncate">{terminology.areaLabel}</span>
              </label>
              <select
                className="w-full h-8 md:h-10 px-1.5 md:px-3 bg-gray-50/50 border border-gray-100 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="all">Todas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary/60" /> Estado
              </label>
              <select
                className="w-full h-8 md:h-10 px-1.5 md:px-3 bg-gray-50/50 border border-gray-100 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="approved">{terminology.reservationLabel.toLowerCase() === 'servicio' ? 'Aprobado' : 'Aprobada'}</option>
                <option value="pending_validation">Pend. Val.</option>
                <option value="pending_payment">Pend. Pago</option>
                <option value="cancelled">Cancelada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>
          </div>

          <div className="mt-2 md:mt-0 md:hidden">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] font-semibold rounded-lg border-gray-100 hover:bg-gray-50 active:scale-95 transition-transform"
              onClick={() => {
                setStatusFilter('all');
                setAreaFilter('all');
                setDateFilter(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
              }}
            >
              Restablecer Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List View */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
          ))
        ) : filteredReservations.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 shadow-inner">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-gray-50 rounded-full mb-4">
                <Search className="w-10 h-10 text-gray-200" />
              </div>
              <p className="text-gray-500 font-semibold">No se encontraron {terminology.reservationLabel.toLowerCase()}s</p>
              <p className="text-gray-400 text-sm mb-6">Intenta ajustando los filtros seleccionados.</p>
              <Button
                variant="outline"
                className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setDateFilter('')}
              >
                Ver todo el historial
              </Button>
            </div>
          </div>
        ) : (
          filteredReservations.map((res) => (
            <div
              key={res.id}
              className={cn(
                "group bg-white rounded-2xl border border-gray-100 apple-shadow hover:apple-shadow-hover hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden relative",
                highlightedIds.has(res.id) && "animate-pulse bg-amber-100 ring-2 ring-amber-400 shadow-lg shadow-amber-200",
                approvedIds.has(res.id) && "animate-pulse bg-green-100 ring-2 ring-green-400 shadow-lg shadow-green-200"
              )}
            >
              {highlightedIds.has(res.id) && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce z-10">
                  <span className="w-1 h-1 rounded-full bg-white" />
                  Nuevo
                </span>
              )}
              {approvedIds.has(res.id) && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce z-10">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Aprobada
                </span>
              )}
              {/* Status indicator bar (left) */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300",
                res.status === 'approved' ? 'bg-green-500' :
                  res.status === 'pending_validation' ? 'bg-amber-500' :
                    res.status === 'pending_payment' ? 'bg-red-500' : 'bg-gray-300'
              )} />

              <div className="flex items-center gap-4 flex-1 min-w-0 ml-1">
                <div className={cn(
                  "p-3 rounded-2xl shadow-sm shrink-0 transition-transform group-hover:scale-110",
                  res.status === 'approved' ? 'bg-green-50 text-green-600' :
                    res.status === 'pending_validation' ? 'bg-amber-50 text-amber-600' :
                      res.status === 'pending_payment' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                )}>
                  {res.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate">{res.resources?.name}</h3>
                    <div className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter whitespace-nowrap",
                      res.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                        res.status === 'pending_validation' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          res.status === 'pending_payment' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                    )}>
                      {res.status === 'approved' ? (terminology.reservationLabel.toLowerCase() === 'servicio' ? 'Aprobado' : 'Aprobada') :
                        res.status === 'pending_validation' ? 'Pendiente Val.' :
                          res.status === 'pending_payment' ? 'Pendiente Pago' :
                            res.status === 'cancelled' ? 'Cancelada' :
                              res.status === 'rejected' ? 'Rechazada' : res.status}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" /> {formatDate(res.start_datetime)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> {formatTime(res.start_datetime)} - {formatTime(res.end_datetime)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-6 sm:border-l border-gray-100">
                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1.5">Costo Total</span>
                  <span className="font-black text-gray-900 text-xl tracking-tight">{formatCurrency(res.total_cost)}</span>
                </div>

                <div className="flex gap-2.5">

                  {['pending_validation', 'pending_payment'].includes(res.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 px-4 border-blue-100 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-xl active:scale-95 transition-all"
                      asChild
                    >
                      <Link to={`/reservations/edit/${res.id}`}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                      </Link>
                    </Button>
                  )}
                  {['pending_payment', 'pending_validation'].includes(res.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 w-10 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl active:scale-95 transition-all"
                      onClick={() => handleCancelClick(res.id)}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog
        open={isCancelAlertOpen}
        onOpenChange={setIsCancelAlertOpen}
        title={`Cancelar ${terminology.reservationLabel}`}
        description={`¿Estás seguro de que deseas cancelar esta ${terminology.reservationLabel.toLowerCase()}? Esta acción no se puede deshacer.`}
        confirmText={`Sí, cancelar ${terminology.reservationLabel.toLowerCase()}`}
        cancelText="No, mantener"
        onConfirm={handleConfirmCancel}
        variant="destructive"
      />
    </div>
  );
}
