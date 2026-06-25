import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatCurrency,
  formatDate,
  formatTime,
  cn
} from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  AlertCircle,
  Loader2,
  Pencil
} from 'lucide-react';

export default function AdminReservationsPage() {
  const navigate = useNavigate();
  const { profile, terminology, businessType } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const { status: subscriptionStatus, daysUntilExpiry, loading: subscriptionLoading, previousSubscriptionExpiredBeyond20Days } = useSubscriptionStatus(profile?.organization_id);

  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  useEffect(() => {
    if (!subscriptionLoading) {
      if (subscriptionStatus === 'cancelled') {
        setBlockingError('Tu suscripción ha sido cancelada. Contacta al administrador para reactivar tu cuenta.');
      } else if (subscriptionStatus === 'inactive' || (subscriptionStatus === 'past_due' && daysUntilExpiry !== undefined && daysUntilExpiry < -20) || (subscriptionStatus === 'past_due' && previousSubscriptionExpiredBeyond20Days)) {
        setBlockingError('Servicio temporalmente inhabilitado, renueva la suscripción para continuar utilizando este servicio.');
      } else {
        setBlockingError(null);
      }
    }
  }, [subscriptionStatus, daysUntilExpiry, subscriptionLoading, previousSubscriptionExpiredBeyond20Days]);

  const fetchReservations = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      const monthStart = startOfMonth(currentMonth).toISOString();
      const monthEnd = endOfMonth(currentMonth).toISOString();
      const orgId = profile.organization_id;
      const pendingStatuses = ['pending_validation', 'pending_payment', 'paid'];

      const baseSelect = `
        *,
        profiles (full_name, apartment, email, role),
        resources (name)
      `;

      const fetchMonth = supabase
        .from('reservations')
        .select(baseSelect)
        .eq('organization_id', orgId)
        .gte('start_datetime', monthStart)
        .lte('start_datetime', monthEnd)
        .order('start_datetime', { ascending: true });

      const fetchPending = supabase
        .from('reservations')
        .select(baseSelect)
        .eq('organization_id', orgId)
        .in('status', pendingStatuses)
        .order('start_datetime', { ascending: true });

      const [monthResult, pendingResult] = await Promise.all([fetchMonth, fetchPending]);

      const monthData = monthResult.data || [];
      const pendingData = pendingResult.data || [];

      const seen = new Set<string>();
      const merged: any[] = [];
      for (const r of pendingData) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }
      for (const r of monthData) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }

      merged.sort((a, b) => {
        const aP = pendingStatuses.includes(a.status) ? 0 : 1;
        const bP = pendingStatuses.includes(b.status) ? 0 : 1;
        if (aP !== bP) return aP - bP;
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });

      setReservations(merged);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, currentMonth]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchReservations();
    }
  }, [fetchReservations, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: newStatus,
          updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
        })
        .eq('id', id)
        .eq('organization_id', profile?.organization_id);

      if (updateError) {
        console.error('Error updating reservation:', updateError);
        return;
      }

      if (newStatus === 'approved') {
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('reservation_id', id)
          .maybeSingle();

        if (!existingPayment) {
          const { data: reservation } = await supabase
            .from('reservations')
            .select('total_cost')
            .eq('id', id)
            .single();

          if (reservation && reservation.total_cost > 0) {
            await supabase
              .from('payments')
              .insert({
                reservation_id: id,
                amount: reservation.total_cost,
                payment_method: 'admin_approval',
                status: 'completed',
                validated_by: profile?.id,
                validated_at: new Date().toISOString()
              });
          }
        } else {
          await supabase
            .from('payments')
            .update({
              validated_by: profile?.id,
              validated_at: new Date().toISOString()
            })
            .eq('reservation_id', id);
        }
      }

      await fetchReservations();
    } finally {
      setUpdatingId(null);
    }
  };

  const isPending = (status: string) => ['pending_validation', 'pending_payment', 'paid'].includes(status);

  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      if (statusFilter !== 'all' && res.status !== statusFilter) return false;
      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        res.profiles?.full_name?.toLowerCase().includes(q) ||
        res.guest_name?.toLowerCase().includes(q) ||
        (businessType === 'residential' && res.profiles?.apartment?.toLowerCase().includes(q)) ||
        res.resources?.name?.toLowerCase().includes(q)
      );
    });
  }, [reservations, debouncedSearch, statusFilter, businessType]);

  const pendingCount = useMemo(() =>
    reservations.filter(r => isPending(r.status)).length,
    [reservations]
  );

  const isSearching = searchTerm !== debouncedSearch;

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; style: string; dot: string }> = {
      'approved': { label: 'Aprobada', style: 'bg-green-50 text-green-700 border-green-100', dot: 'bg-green-500' },
      'paid': { label: 'Pagado', style: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
      'pending_validation': { label: 'Pend. Val.', style: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
      'pending_payment': { label: 'Pend. Pago', style: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
      'rejected': { label: 'Rechazada', style: 'bg-gray-50 text-gray-500 border-gray-100', dot: 'bg-gray-400' },
      'cancelled': { label: 'Cancelada', style: 'bg-gray-50 text-gray-400 border-gray-100', dot: 'bg-gray-300' },
    };
    return map[status] || { label: status, style: 'bg-gray-50 text-gray-500 border-gray-100', dot: 'bg-gray-400' };
  };

  return (
    <div className="space-y-3 md:space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
          <ClipboardList className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">Gestión de {terminology.reservationLabel}s</h1>
          <p className="text-xs text-gray-500 truncate">Administra las solicitudes de {terminology.userLabel.toLowerCase()}s.</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-200 shrink-0 animate-pulse">
            {pendingCount} pend.
          </div>
        )}
      </div>

      {blockingError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-800 font-medium">{blockingError}</p>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col gap-2">
        {/* Month navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-bold text-gray-700 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors shrink-0"
          >
            Hoy
          </button>
        </div>

        {/* Search + Status filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder={`Buscar...`}
              className={cn(
                "pl-8 h-8 rounded-lg text-xs border-gray-200 transition-colors",
                isSearching && "border-primary ring-2 ring-primary/20"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
            )}
          </div>
          <select
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[11px] text-gray-700 font-medium w-auto outline-none focus:ring-1 focus:ring-primary shrink-0"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending_validation">Pend. Val.</option>
            <option value="pending_payment">Pend. Pago</option>
            <option value="paid">Pagado</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCurrentMonth(new Date()); }}
              className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <Card className="border-none shadow-sm bg-white hidden min-[1185px]:block">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{terminology.userLabel} {businessType === 'residential' ? `/ ${terminology.unitLabel}` : ''}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{terminology.areaLabel}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha / Hora</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Costo</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Estado</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se encontraron {terminology.reservationLabel.toLowerCase()}s.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const statusInfo = getStatusInfo(res.status);
                  return (
                    <tr key={res.id} className={cn(
                      "hover:bg-gray-50/50 transition-colors",
                      isPending(res.status) && "bg-amber-50/30"
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-gray-900 truncate">
                            {res.guest_name || (res.profiles?.role === 'guest' ? 'Invitado' : res.profiles?.full_name) || 'Invitado'}
                          </div>
                          {res.profiles?.role === 'guest' && (
                            <span className="bg-blue-50 text-blue-600 text-[9px] font-medium px-1.5 py-0.5 rounded border border-blue-100 shrink-0">Invitado</span>
                          )}
                        </div>
                        {businessType === 'residential' && res.profiles?.apartment && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{terminology.unitLabel} {res.profiles?.apartment}</div>
                        )}
                        <div className="flex items-center gap-3 mt-0.5">
                        {res.guest_phone ? (
                          <span className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                            <Smartphone className="w-2.5 h-2.5 text-gray-400" />{res.guest_phone}
                          </span>
                        ) : res.profiles?.phone ? (
                          <span className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                            <Smartphone className="w-2.5 h-2.5 text-gray-400" />{res.profiles.phone}
                          </span>
                        ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium truncate">{res.resources?.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-gray-700 text-xs">{formatDate(res.start_datetime)}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{formatTime(res.start_datetime)} - {formatTime(res.end_datetime)}</div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold text-gray-900 text-xs">{formatCurrency(res.total_cost)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase", statusInfo.style)}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
                          {statusInfo.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" disabled={!!blockingError} variant="outline" className="h-8 px-2.5 text-[10px] font-bold rounded-lg border-gray-200 text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-1 whitespace-nowrap disabled:opacity-50" onClick={() => navigate(`/reservations/edit/${res.id}`)}>
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Button>
                          {isPending(res.status) && (
                            <>
                              <Button size="sm" disabled={!!blockingError || !!updatingId} className="h-8 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-[10px] font-bold text-white rounded-lg transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:shadow-[0_0_18px_rgba(16,185,129,0.6)] whitespace-nowrap disabled:opacity-50" onClick={() => handleUpdateStatus(res.id, 'approved')}>
                                {updatingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} {updatingId === res.id ? 'Aprobando...' : 'Aprobar'}
                              </Button>
                              <Button size="sm" disabled={!!blockingError || !!updatingId} className="h-8 px-2.5 bg-red-500 hover:bg-red-600 text-[10px] font-bold text-white rounded-lg transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:shadow-[0_0_18px_rgba(239,68,68,0.6)] whitespace-nowrap disabled:opacity-50" onClick={() => handleUpdateStatus(res.id, 'rejected')}>
                                {updatingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} {updatingId === res.id ? 'Rechazando...' : 'Rechazar'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Tablet & Mobile Cards View */}
      <div className="flex flex-col gap-2 min-[1185px]:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-xl border border-gray-100" />
          ))
        ) : filteredReservations.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No se encontraron {terminology.reservationLabel.toLowerCase()}s</p>
          </div>
        ) : (
          filteredReservations.map((res) => {
            const statusInfo = getStatusInfo(res.status);
            const pending = isPending(res.status);
            const userName = res.guest_name || res.profiles?.full_name;

            return (
              <div
                key={res.id}
                className={cn(
                  "bg-white rounded-xl border transition-all duration-300",
                  pending ? "border-amber-200 shadow-md shadow-amber-100/50" : "border-gray-100 shadow-sm"
                )}
              >
                <div className="px-3 py-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-sm truncate">{userName}</span>
                        {res.profiles?.role === 'guest' && (
                          <span className="bg-blue-50 text-blue-600 text-[8px] font-medium px-1 py-0.5 rounded border border-blue-100 shrink-0">Invitado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 truncate">{res.resources?.name}</span>
                        {businessType === 'residential' && res.profiles?.apartment && (
                          <span className="text-[10px] text-gray-400 shrink-0">{terminology.unitLabel} {res.profiles?.apartment}</span>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border uppercase",
                      statusInfo.style
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{formatDate(res.start_datetime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatTime(res.start_datetime)} - {formatTime(res.end_datetime)}</span>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 text-xs shrink-0">{formatCurrency(res.total_cost)}</span>
                  </div>

                  {res.guest_phone ? (
                    <a href={`tel:${res.guest_phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-1 text-primary font-bold w-fit">
                      <Smartphone className="w-3 h-3" />
                      <span className="text-[10px]">{res.guest_phone}</span>
                    </a>
                  ) : res.profiles?.phone ? (
                    <a href={`tel:${res.profiles.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-1 text-primary font-bold w-fit">
                      <Smartphone className="w-3 h-3" />
                      <span className="text-[10px]">{res.profiles.phone}</span>
                    </a>
                  ) : null}
                </div>

                {(isAdmin || ['pending_validation', 'pending_payment'].includes(res.status)) && (
                  <div className="flex border-t border-amber-100">
                    <button
                      disabled={!!blockingError}
                      onClick={() => navigate(`/reservations/edit/${res.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-primary/5 hover:text-primary active:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {pending && (
                      <>
                        <div className="w-px bg-amber-100" />
                        <button
                          disabled={!!blockingError || !!updatingId}
                          onClick={() => handleUpdateStatus(res.id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors disabled:opacity-50 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                        >
                          {updatingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <CheckCircle className="w-3.5 h-3.5" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.6))' }} />}
                          {updatingId === res.id ? 'Aprobando...' : 'Aprobar'}
                        </button>
                        <div className="w-px bg-amber-100" />
                        <button
                          disabled={!!blockingError || !!updatingId}
                          onClick={() => handleUpdateStatus(res.id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-red-600 bg-red-50/50 hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-50 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                        >
                          {updatingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <XCircle className="w-3.5 h-3.5" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }} />}
                          {updatingId === res.id ? 'Rechazando...' : 'Rechazar'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
