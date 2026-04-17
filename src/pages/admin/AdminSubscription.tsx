import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { createSubscriptionPayment } from '@/lib/paymentService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Calendar, AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  subscription_plans: {
    id: string;
    name: string;
    price: number;
    duration_in_days: number;
    description: string;
  };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_in_days: number;
  description: string;
  is_active: boolean;
}

export default function AdminSubscription() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchSubscription();
      fetchPlans();
      fetchPendingPayments();
    }
  }, [profile]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      } else if (data && data.length > 0) {
        setSubscription(data[0]);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
      } else {
        setPlans(data || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select(`
          *,
          subscriptions!inner (
            organization_id
          )
        `)
        .eq('status', 'pending')
        .eq('subscriptions.organization_id', profile?.organization_id);

      if (error) {
        console.error('Error fetching pending payments:', error);
      } else {
        setPendingPayments(data || []);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  };

  const handleRenewSubscription = async (planId: string) => {
    setRenewing(true);
    try {
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        throw new Error('Plan no encontrado');
      }

      let subscriptionId = subscription?.id;

      if (!subscriptionId) {
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + selectedPlan.duration_in_days * 24 * 60 * 60 * 1000).toISOString();

        const { data: newSubscription, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            organization_id: profile?.organization_id,
            plan_id: planId,
            start_date: startDate,
            end_date: endDate,
            status: 'pending',
            auto_renew: false
          })
          .select()
          .single();

        if (subError) {
          throw subError;
        }

        subscriptionId = newSubscription.id;

        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'pending',
            subscription_end_date: endDate
          })
          .eq('id', profile?.organization_id);

        if (orgError) {
          console.error('Error updating organization subscription_status:', orgError);
        }
      } else {
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + selectedPlan.duration_in_days * 24 * 60 * 60 * 1000).toISOString();

        const { data: newSubscription, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            organization_id: profile?.organization_id,
            plan_id: planId,
            start_date: startDate,
            end_date: endDate,
            status: 'pending',
            auto_renew: false
          })
          .select()
          .single();

        if (subError) {
          throw subError;
        }

        subscriptionId = newSubscription.id;

        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'pending',
            subscription_end_date: endDate
          })
          .eq('id', profile?.organization_id);

        if (orgError) {
          console.error('Error updating organization subscription_status:', orgError);
        }
      }

      const result = await createSubscriptionPayment(subscriptionId);

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error managing subscription:', error);
      alert('Error al gestionar la suscripción: ' + errorMsg);
    } finally {
      setRenewing(false);
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDateSimple = (dateStr: string) => {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    };

  const getExpiryStatus = (endDate: string) => {
    // Check subscription status first
    if (subscription?.status === 'cancelled') {
      return { status: 'cancelled', label: 'Cancelada' };
    }
    
    if (subscription?.status === 'expired') {
      return { status: 'past_due', label: `Vencida el ${formatDateSimple(endDate)}` };
    }

    // Check if there are pending payments for this subscription
    const hasPendingPayments = pendingPayments.length > 0;

    if (hasPendingPayments) {
      return { status: 'pending_validation', label: `Pendiente de validación hasta ${formatDateSimple(endDate)}` };
    }

    const days = getDaysUntilExpiry(endDate);
    if (days < 0) return { status: 'past_due', label: `Vencida el ${formatDateSimple(endDate)}` };
    if (days <= 7) return { status: 'pending_validation', label: `Vence en ${days} día${days !== 1 ? 's' : ''}` };
    return { status: 'active', label: `Activa hasta ${formatDateSimple(endDate)}` };
  };

  const isSubscriptionActive = () => {
    if (!subscription) return false;
    // Check if subscription status is active and not expired
    const expiryStatus = getExpiryStatus(subscription.end_date);
    return expiryStatus.status === 'active';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suscripción</h1>
          <p className="text-gray-600">Gestiona tu suscripción y planes disponibles</p>
        </div>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Suscripción Actual
          </CardTitle>
          <CardDescription>
            Información sobre tu plan de suscripción activo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {subscription.subscription_plans?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {subscription.subscription_plans?.description}
                  </p>
                </div>
                <div className={cn(
                  "inline-flex items-center w-fit rounded-full px-3 py-1 text-sm font-bold border uppercase",
                  getExpiryStatus(subscription.end_date).status === 'past_due'
                    ? "bg-red-50 text-red-700 border-red-100"
                    : getExpiryStatus(subscription.end_date).status === 'pending_validation'
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : getExpiryStatus(subscription.end_date).status === 'cancelled'
                    ? "bg-gray-50 text-gray-500 border-gray-100"
                    : "bg-green-50 text-green-700 border-green-100"
                )}>
                  {getExpiryStatus(subscription.end_date).status === 'past_due' && <AlertCircle className="w-4 h-4 mr-2" />}
                  {getExpiryStatus(subscription.end_date).status === 'pending_validation' && <AlertCircle className="w-4 h-4 mr-2" />}
                  {getExpiryStatus(subscription.end_date).status === 'cancelled' && <XCircle className="w-4 h-4 mr-2" />}
                  {getExpiryStatus(subscription.end_date).status === 'active' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {getExpiryStatus(subscription.end_date).label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Valor del plan:</span>
                  <div className="font-semibold">
                    ${subscription.subscription_plans?.price?.toLocaleString('es-CO')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Fecha de inicio:</span>
                  <div className="font-semibold">
                    {formatDateSimple(subscription.start_date)}
                  </div>
                </div>
              </div>

              {subscription.auto_renew && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Renovación automática activada
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes una suscripción activa
              </h3>
              <p className="text-gray-600">
                Selecciona uno de los planes disponibles para activar tu suscripción
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Planes Disponibles
          </CardTitle>
          <CardDescription>
            Elige el plan que mejor se adapte a tus necesidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold text-primary">
                    ${plan.price.toLocaleString('es-CO')}
                  </div>

                  <div className="text-sm text-gray-600">
                    Duración: {plan.duration_in_days} días
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setShowConfirmModal(true);
                    }}
                    disabled={renewing || (subscription?.status === 'pending') || pendingPayments.length > 0}
                  >
                    {renewing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {subscription ? 'Renovar' : 'Activar'} Plan
                      </>
                    )}
                  </Button>
                  {(subscription?.status === 'pending') && (
                    <p className="text-xs text-amber-600 text-center mt-2">
                      No puedes modificar la suscripción mientras está en validación.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Información de pago</h4>
            <p className="text-sm text-blue-700">
              Los pagos se realizan mediante transferencia bancaria a la cuenta del administrador.
              Una vez realizado el pago, tu suscripción quedará en estado de validación hasta que
              el administrador del sistema confirme la recepción del mismo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Renovación
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {isSubscriptionActive() ? (
                "Tienes una subscripcion activa, si adquieres este plan se perderan los dias restantes de tu plan actual. La nueva subscripcion iniciara a partir de que se valide el pago."
              ) : (
                "El plan se renovara a partir de la fecha que se valide el pago."
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedPlanId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (selectedPlanId) {
                    handleRenewSubscription(selectedPlanId);
                  }
                  setSelectedPlanId(null);
                }}
                disabled={renewing}
              >
                {renewing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Renovar Plan"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}