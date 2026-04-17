import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  formatCurrency, 
  formatDate, 
  formatTime, 
  cn 
} from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Search,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList
} from 'lucide-react';

export default function AdminReservationsPage() {
  const { profile, terminology, businessType } = useAuth();
  const { status: subscriptionStatus, daysUntilExpiry, loading: subscriptionLoading, previousSubscriptionExpiredBeyond20Days } = useSubscriptionStatus(profile?.organization_id);
  
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [blockingError, setBlockingError] = useState<string | null>(null);

  // Debug: mostrar loading inicial del perfil
  useEffect(() => {
    console.log('AdminReservations - Componente mounting');
  }, []);

  useEffect(() => {
    console.log('AdminReservations - profile changed:', profile);
    console.log('AdminReservations - organization_id:', profile?.organization_id);
  }, [profile]);

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

  useEffect(() => {
    if (profile?.organization_id) {
      fetchReservations();
    }
  }, [statusFilter, profile?.organization_id]);

  const fetchReservations = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    let query = supabase
      .from('reservations')
      .select(`
        *,
        profiles (full_name, apartment, email, role),
        common_areas (name)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setReservations(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
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

    fetchReservations();
  };

  const filteredReservations = reservations.filter(res => 
    res.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (businessType === 'residential' && res.profiles?.apartment?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    res.common_areas?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de {terminology.reservationLabel}s</h1>
            <p className="text-gray-500 text-sm">Valida y gestiona las solicitudes de {terminology.userLabel.toLowerCase()}s.</p>
            {blockingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-red-800 font-medium">{blockingError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 bg-gray-50/50 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder={`Buscar por nombre, ${businessType === 'residential' ? terminology.unitLabel.toLowerCase() + ', ' : ''}${terminology.areaLabel.toLowerCase()}...`} 
                className="pl-10 h-9 rounded-lg text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select 
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 font-medium w-full md:w-48 outline-none focus:ring-1 focus:ring-primary shadow-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="pending_validation">Pendiente Validación</option>
                <option value="pending_payment">Pendiente Pago</option>
                <option value="paid">Pagado (Wompi)</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-visible">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/30 border-b border-gray-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{terminology.userLabel} {businessType === 'residential' ? `/ ${terminology.unitLabel}` : ''}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{terminology.areaLabel}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded-full w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredReservations.length === 0 ? (
                  <tr>
<td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                       No se encontraron {terminology.reservationLabel.toLowerCase()}s.
                     </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-gray-900">
                            {res.guest_name || res.profiles?.full_name}
                          </div>
                          {res.profiles?.role === 'guest' && (
                            <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                              Invitado
                            </span>
                          )}
                        </div>
                        {res.guest_phone && (
                          <div className="text-[10px] text-primary font-medium mt-0.5">
                            Tel: {res.guest_phone}
                          </div>
                        )}
                        {businessType === 'residential' && res.profiles?.apartment && (
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-300" />
                            {terminology.unitLabel} {res.profiles?.apartment}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{res.common_areas?.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatDate(res.start_datetime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-300" />
                          <span>{formatTime(res.start_datetime)} - {formatTime(res.end_datetime)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{formatCurrency(res.total_cost)}</span>
                      </td>
                      <td className="px-6 py-4">
                         {(() => {
                           const statusStyles: Record<string, string> = {
                              'approved': 'bg-green-50 text-green-700 border-green-100',
                              'paid': 'bg-blue-50 text-blue-700 border-blue-100',
                              'pending_validation': 'bg-amber-50 text-amber-700 border-amber-100',
                              'pending_payment': 'bg-red-50 text-red-700 border-red-100',
                              'rejected': 'bg-gray-50 text-gray-600 border-gray-100',
                              'cancelled': 'bg-gray-50 text-gray-400 border-gray-100',
                            };
                            const statusLabels: Record<string, string> = {
                              'approved': 'Aprobada',
                              'paid': 'Pagado',
                              'pending_validation': 'Pend. Validación',
                              'pending_payment': 'Pend. Pago',
                              'rejected': 'Rechazada',
                              'cancelled': 'Cancelada',
                            };
                           const style = statusStyles[res.status] || 'bg-gray-50 text-gray-600 border-gray-100';
                              return (
                              <div className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase",
                                style
                              )}>
                                {statusLabels[res.status] || res.status.replace('_', ' ')}
                              </div>
                            )
                          })()}
                       </td>
                       <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           {(res.status === 'pending_validation' || res.status === 'pending_payment' || res.status === 'paid') && (
                            <>
                              <Button
                                size="sm"
                                disabled={!!blockingError}
                                className="h-10 px-4 bg-green-600 hover:bg-green-700 text-xs font-bold text-white shadow-md shadow-green-600/20 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => handleUpdateStatus(res.id, 'approved')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!!blockingError}
                                className="h-10 px-4 text-xs font-bold shadow-md shadow-red-500/20 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => handleUpdateStatus(res.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Cancelar Reserva
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-24 bg-gray-100 rounded-xl w-full" />
                </div>
              ))
            ) : filteredReservations.length === 0 ? (
<div className="px-6 py-12 text-center text-gray-400 text-sm">
                  No se encontraron {terminology.reservationLabel.toLowerCase()}s.
               </div>
            ) : (
              filteredReservations.map((res) => (
                <div key={res.id} className="p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 truncate">
                            {res.guest_name || res.profiles?.full_name}
                          </h3>
                          {res.profiles?.role === 'guest' && (
                            <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-1 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                              Inv
                            </span>
                          )}
                        </div>
                        {res.guest_phone && (
                          <span className="text-[10px] text-primary font-bold">Tel: {res.guest_phone}</span>
                        )}
                        {businessType === 'residential' && res.profiles?.apartment && (
                          <span className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {terminology.unitLabel} {res.profiles?.apartment}
                          </span>
                        )}
                    </div>
                    {(() => {
                      const statusStyles: Record<string, string> = {
                        'approved': 'bg-green-50 text-green-700 border-green-100',
                        'paid': 'bg-blue-50 text-blue-700 border-blue-100',
                        'pending_validation': 'bg-amber-50 text-amber-700 border-amber-100',
                        'pending_payment': 'bg-red-50 text-red-700 border-red-100',
                        'rejected': 'bg-gray-50 text-gray-600 border-gray-100',
                        'cancelled': 'bg-gray-50 text-gray-400 border-gray-100',
                      };
                      const statusLabels: Record<string, string> = {
                        'approved': 'Aprobada',
                        'paid': 'Pagado',
                        'pending_validation': 'Pend. Validación',
                        'pending_payment': 'Pend. Pago',
                        'rejected': 'Rechazada',
                        'cancelled': 'Cancelada',
                      };
                      const style = statusStyles[res.status] || 'bg-gray-50 text-gray-600 border-gray-100';
                      return (
                        <div className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase shrink-0 whitespace-nowrap",
                          style
                        )}>
                          {statusLabels[res.status] || res.status.replace('_', ' ').substring(0, 15)}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                      <ClipboardList className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{res.common_areas?.name}</span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{formatDate(res.start_datetime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{formatTime(res.start_datetime)} - {formatTime(res.end_datetime)}</span>
                        </div>
                      </div>
                      
                      <div className="font-bold text-gray-900 text-sm bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        {formatCurrency(res.total_cost)}
                      </div>
                    </div>
                  </div>

                  {(res.status === 'pending_validation' || res.status === 'pending_payment' || res.status === 'paid') && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-gray-50">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!!blockingError}
                        className="h-10 px-4 text-xs font-bold w-full flex-1 rounded-xl transition-all duration-300"
                        onClick={() => handleUpdateStatus(res.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Cancelar Reserva
                      </Button>
                      <Button
                        size="sm"
                        disabled={!!blockingError}
                        className="h-10 px-4 bg-green-600 hover:bg-green-700 text-xs font-bold w-full flex-1 text-white rounded-xl transition-all duration-300"
                        onClick={() => handleUpdateStatus(res.id, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Aprobar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
