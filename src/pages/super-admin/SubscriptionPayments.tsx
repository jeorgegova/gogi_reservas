import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Receipt,
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  X
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SuperAdminSubscriptionPayments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    setAlertConfig({
      open: true,
      title,
      description,
      onConfirm: () => {},
      variant,
      showCancel: false,
      confirmText: 'Entendido'
    });
  };

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      fetchPayments();
    }
  }, [profile, dateFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [year, month] = dateFilter.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const { data, error } = await supabase
        .from('subscription_payments')
        .select(`
          *,
          subscriptions (
            id,
            organizations (
              name,
              slug
            ),
            subscription_plans (
              name,
              price
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'completed': 'Completado',
      'failed': 'Fallido',
      'pending': 'Pendiente'
    };
    return labels[status] || status;
  };

  const handleAuthorizePayment = async (paymentId: string) => {
    try {
      // First get the payment to know the subscription_id
      const { data: payment } = await supabase
        .from('subscription_payments')
        .select('subscription_id')
        .eq('id', paymentId)
        .single();

      if (!payment) throw new Error('Pago no encontrado');

      // Update payment status
      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Update subscription status to active
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', payment.subscription_id);

      if (subscriptionError) {
        console.error('Error updating subscription status:', subscriptionError);
        // Don't fail the payment approval
      }

      // Get subscription details including plan duration
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('organization_id, plan_id')
        .eq('id', payment.subscription_id)
        .single();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      }

      // Now get the plan details
      let duration = 0;
      if (subscriptionData && subscriptionData?.plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('duration_in_days')
          .eq('id', subscriptionData.plan_id)
          .single();
        
        duration = planData?.duration_in_days || 0;
      }

      if (duration > 0 && subscriptionData) {
        // Calculate new end_date from validation date
        const validationDate = new Date();
        const newEndDate = new Date(validationDate.getTime() + duration * 24 * 60 * 60 * 1000);

        // Update subscription end_date
        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update({ end_date: newEndDate.toISOString() })
          .eq('id', payment.subscription_id);

        if (subUpdateError) {
          console.error('Error updating subscription end_date:', subUpdateError);
        }

        // Update organization subscription_status and end_date
        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'active',
            subscription_end_date: newEndDate.toISOString()
          })
          .eq('id', subscriptionData.organization_id);

        if (orgError) {
          console.error('Error updating organization subscription_status:', orgError);
        }
      }

      fetchPayments(); // Refresh the data
    } catch (error: any) {
      console.error('Error authorizing payment:', error);
      showAlert('Error al autorizar', error.message, 'destructive');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    showConfirm(
      '¿Estás seguro de cancelar este pago?',
      'La suscripción solicitada será cancelada y la organización volverá a su estado anterior.',
      async () => {
        try {
          // Get payment to know subscription_id
          const { data: payment } = await supabase
            .from('subscription_payments')
            .select('subscription_id')
            .eq('id', paymentId)
            .single();

          if (!payment) throw new Error('Pago no encontrado');

          // Update payment status to failed
          const { error: paymentError } = await supabase
            .from('subscription_payments')
            .update({
              status: 'failed',
              paid_at: null
            })
            .eq('id', paymentId);

          if (paymentError) throw paymentError;

          // Get subscription details to find organization_id
          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('organization_id')
            .eq('id', payment.subscription_id)
            .single();

          if (subscriptionData) {
            // Update subscription status to cancelled
            await supabase
              .from('subscriptions')
              .update({ status: 'cancelled' })
              .eq('id', payment.subscription_id);

            // Fetch ALL subscriptions for this organization to find the previous valid one
            const { data: allSubscriptions } = await supabase
              .from('subscriptions')
              .select('id, status, end_date')
              .eq('organization_id', subscriptionData.organization_id)
              .neq('status', 'pending')
              .neq('id', payment.subscription_id) // Exclude the one we just cancelled
              .order('created_at', { ascending: false });

            // The most recent non-pending/non-cancelled one would be the "previous" state
            // If none found, we'll set it to inactive
            const previousSub = allSubscriptions?.find(s => s.status === 'active' || s.status === 'expired');

            if (previousSub) {
              // Revert organization to previous subscription state
              await supabase
                .from('organizations')
                .update({
                  subscription_status: previousSub.status,
                  subscription_end_date: previousSub.end_date
                })
                .eq('id', subscriptionData.organization_id);
            } else {
              // No previous valid subscription, set to inactive
              await supabase
                .from('organizations')
                .update({
                  subscription_status: 'inactive',
                  subscription_end_date: null
                })
                .eq('id', subscriptionData.organization_id);
            }
          }

          fetchPayments(); // Refresh data
        } catch (error: any) {
          console.error('Error rejecting payment:', error);
          showAlert('Error al cancelar', error.message, 'destructive');
        }
      },
      'destructive'
    );
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    setAlertConfig({
      open: true,
      title,
      description,
      onConfirm,
      variant,
      showCancel: true,
      confirmText: 'Confirmar',
      cancelText: 'Volver'
    });
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm ||
      payment.subscriptions?.organizations?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.subscriptions?.organizations?.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <X className="w-12 h-12 mb-4 text-red-400" />
        <p className="text-lg font-medium">Acceso no autorizado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-600 rounded-xl shadow-lg shadow-green-500/20">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pagos de Suscripción</h1>
            <p className="text-gray-500 text-sm">Historial completo de pagos de suscripciones.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Pagos</p>
              <p className="text-xl font-bold text-gray-900">{filteredPayments.length}</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completados</p>
              <p className="text-xl font-bold text-green-600">
                {filteredPayments.filter(p => p.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pendientes</p>
              <p className="text-xl font-bold text-amber-600">
                {filteredPayments.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Ingresos</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 bg-gray-50/50 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por organización o transacción..."
                className="pl-10 h-10 rounded-xl text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-sm font-medium bg-transparent border-none focus:ring-0 outline-none text-gray-700 cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    return (
                      <option key={i} value={format(date, 'yyyy-MM')}>
                        {format(date, 'MMMM yyyy', { locale: es })}
                      </option>
                    );
                  })}
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Todos los estados</option>
                <option value="completed">Completados</option>
                <option value="pending">Pendientes</option>
                <option value="failed">Fallidos</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/30 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Organización</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transacción</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-6">
                        <div className="h-4 bg-gray-100 rounded-full w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      No se encontraron pagos en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-gray-900">
                            {payment.subscriptions?.organizations?.name || 'N/A'}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {payment.subscriptions?.organizations?.slug}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">
                          {payment.subscriptions?.subscription_plans?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center px-2 py-0.5 text-[10px] font-bold border uppercase rounded-full",
                          payment.status === 'completed'
                            ? "bg-green-50 text-green-700 border-green-100"
                            : payment.status === 'failed'
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          {getStatusIcon(payment.status)}
                          <span className="ml-1">{getStatusLabel(payment.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">
                          {formatDate(payment.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-gray-500 font-mono">
                          {payment.transaction_id || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {payment.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleRejectPayment(payment.id)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-3 bg-green-600 hover:bg-green-700 text-xs font-medium text-white"
                              onClick={() => handleAuthorizePayment(payment.id)}
                            >
                              Autorizar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alert Dialog Global */}
      <AlertDialog
        open={alertConfig.open}
        onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
        title={alertConfig.title}
        description={alertConfig.description}
        onConfirm={alertConfig.onConfirm}
        variant={alertConfig.variant}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </div>
  );
}