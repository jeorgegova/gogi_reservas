import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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

  useEffect(() => {
    if (profile?.organization_id) {
      fetchReservations();
      fetchAreas();
    }
  }, [profile?.organization_id]);

  const fetchAreas = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('common_areas')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true);
    setAreas(data || []);
  };

  const fetchReservations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reservations')
      .select(`
        *,
        common_areas (name, image_url)
      `)
      .eq('user_id', profile?.id)
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false });

    setReservations(data || []);
    setLoading(false);
  };

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

    if (!error) fetchReservations();
    setIsCancelAlertOpen(false);
    setReservationToCancel(null);
  };

  // Lógica de filtrado y cálculo de total
  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      const matchStatus = statusFilter === 'all' || res.status === statusFilter;
      const matchArea = areaFilter === 'all' || res.common_area_id === areaFilter;

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
        <Button asChild className="bg-primary hover:bg-primary/95 shadow-lg shadow-primary/25 h-11 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
          <Link to="/reservations/new">Nueva {terminology.reservationLabel}</Link>
        </Button>
      </div>

      {/* Indicadores Financieros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 border-none shadow-sm bg-primary/5 border-l-4 border-primary overflow-hidden group">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Total Invertido</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:scale-105 origin-left">
                {formatCurrency(totalInvested)}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Suma de {terminology.reservationLabel.toLowerCase()}s {terminology.reservationLabel.toLowerCase() === 'reserva' ? 'aprobadas' : 'aprobados'}</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:rotate-12 transition-transform">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-none shadow-sm bg-blue-50/50 border-l-4 border-blue-500 overflow-hidden group">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{terminology.reservationLabel}s Aprobados</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:scale-105 origin-left">
                {totalServices}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">{terminology.reservationLabel}s {terminology.reservationLabel.toLowerCase() === 'reserva' ? 'aprobadas' : 'aprobados'}</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:-rotate-12 transition-transform">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-none shadow-sm overflow-visible bg-white/80 backdrop-blur-sm sticky top-0 z-10 transition-all hover:bg-white">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-primary/60" /> Fecha Desde
              </label>
              <input
                type="date"
                className="w-full h-10 px-3 bg-gray-50/50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary/60" /> {terminology.areaLabel}
              </label>
              <select
                className="w-full h-10 px-3 bg-gray-50/50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="all">Todas las {terminology.areaLabel.toLowerCase()}s</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-primary/60" /> Estado
              </label>
              <select
                className="w-full h-10 px-3 bg-gray-50/50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="approved">Aprobada</option>
                <option value="pending_validation">Pendiente Validación</option>
                <option value="pending_payment">Pendiente Pago</option>
                <option value="cancelled">Cancelada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 text-xs font-semibold rounded-lg border-gray-100 hover:bg-gray-50 active:scale-95 transition-transform"
                onClick={() => {
                  setStatusFilter('all');
                  setAreaFilter('all');
                  setDateFilter(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                }}
              >
                Restablecer Filtros
              </Button>
            </div>
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
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden relative"
            >
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
                    <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate">{res.common_areas?.name}</h3>
                    <div className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter whitespace-nowrap",
                      res.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                        res.status === 'pending_validation' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          res.status === 'pending_payment' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                    )}>
                      {res.status === 'approved' ? 'Aprobada' :
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
                  {res.status === 'pending_payment' && (
                    <Button
                      size="sm"
                      className="h-10 px-6 bg-red-600 hover:bg-red-700 text-xs font-black rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                      onClick={() => window.location.href = `/payment/${res.id}`}
                    >
                      Pagar
                    </Button>
                  )}
                  {res.status === 'pending_validation' && (
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
