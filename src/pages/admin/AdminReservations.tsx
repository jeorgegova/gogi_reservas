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
  const { profile } = useAuth();
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
        profiles (full_name, apartment, email),
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
    // First update the reservation status
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

    // If approving, create a payment record
    if (newStatus === 'approved') {
      // Get the reservation details to create payment
      const { data: reservation } = await supabase
        .from('reservations')
        .select('total_cost')
        .eq('id', id)
        .single();

      if (reservation && reservation.total_cost > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            reservation_id: id,
            amount: reservation.total_cost,
            payment_method: 'admin_approval', // or whatever method
            status: 'completed',
            validated_by: profile?.id,
            validated_at: new Date().toISOString()
          });

        if (paymentError) {
          console.error('Error creating payment:', paymentError);
          // Note: We don't fail the approval if payment creation fails
          // Could add user notification here
        }
      }
    }

    fetchReservations();
  };

  const filteredReservations = reservations.filter(res => 
    res.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.profiles?.apartment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Reservas</h1>
            <p className="text-gray-500 text-sm">Valida y gestiona las solicitudes del conjunto.</p>
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
                placeholder="Buscar por nombre, apto..." 
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
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/30 border-b border-gray-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Usuario / Apto</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Área</th>
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
                       No se encontraron reservas.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{res.profiles?.full_name}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-300" />
                          Apto {res.profiles?.apartment}
                        </div>
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
                             'pending_validation': 'bg-amber-50 text-amber-700 border-amber-100',
                             'pending_payment': 'bg-red-50 text-red-700 border-red-100',
                             'rejected': 'bg-gray-50 text-gray-600 border-gray-100',
                             'cancelled': 'bg-gray-50 text-gray-400 border-gray-100',
                           };
                           const style = statusStyles[res.status] || 'bg-gray-50 text-gray-600 border-gray-100';
                           return (
                             <div className={cn(
                               "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase",
                               style
                             )}>
                               {res.status.replace('_', ' ')}
                             </div>
                           )
                         })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {res.status === 'pending_validation' && (
                            <>
                              <Button
                                size="sm"
                                disabled={!!blockingError}
                                className="h-8 px-3 bg-green-600 hover:bg-green-700 text-xs font-medium shadow-lg shadow-green-500/25"
                                onClick={() => handleUpdateStatus(res.id, 'approved')}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!!blockingError}
                                className="h-8 px-3 text-xs font-medium"
                                onClick={() => handleUpdateStatus(res.id, 'rejected')}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                Rechazar
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
        </CardContent>
      </Card>
    </div>
  );
}
