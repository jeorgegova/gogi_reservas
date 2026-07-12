import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Calendar, AlertCircle, CheckCircle2, Loader2, XCircle, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  features: any;
  max_reservations: number | null;
  max_reservations_per_day: number | null;
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

      // Crear el pago en estado pendiente (sin pasar por Wompi)
      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          subscription_id: subscriptionId,
          amount: selectedPlan.price,
          status: 'pending',
          payment_method: 'pending_transfer',
        });

      if (paymentError) {
        throw paymentError;
      }

      await fetchPendingPayments();
      await fetchSubscription();
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
    const expiryStatus = getExpiryStatus(subscription.end_date);
    return expiryStatus.status === 'active';
  };

  const getFeaturesList = (plan: SubscriptionPlan): string[] => {
    if (!plan.features) return [];
    if (Array.isArray(plan.features)) return plan.features;
    if (typeof plan.features === 'object') {
      return Object.values(plan.features).filter((f) => typeof f === 'string') as string[];
    }
    if (typeof plan.features === 'string') {
      try { const parsed = JSON.parse(plan.features); return Array.isArray(parsed) ? parsed : []; }
      catch { return []; }
    }
    return [];
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
        <div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg shadow-primary/25 ring-1 ring-white/20">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suscripción</h1>
          <p className="text-gray-600">Gestiona tu suscripción y planes disponibles</p>
        </div>
      </div>

      {/* Pending payment message */}
      {pendingPayments.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Renovación en estado pendiente</h3>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                Tu solicitud de renovación fue recibida correctamente. Estamos a la espera de la validación del pago por parte del administrador. Una vez confirmado, tu suscripción se activará automáticamente.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Si ya realizaste el pago, por favor ten paciencia. Si tienes dudas, contacta al administrador.
              </p>
            </div>
          </div>
        </div>
      )}

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
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {subscription.subscription_plans?.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Valor</span>
                  <div className="font-bold text-gray-900 mt-0.5">${(subscription as any).subscription_plans?.price?.toLocaleString('es-CO') || 0}{((subscription as any).subscription_plans?.price || 0) > 0 ? ((subscription as any).subscription_plans?.duration_in_days === 30 ? '/mes' : (subscription as any).subscription_plans?.duration_in_days === 365 ? '/año' : '') : ''}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Inicio</span>
                  <div className="font-bold text-gray-900 mt-0.5">{formatDateSimple(subscription.start_date)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Vencimiento</span>
                  <div className="font-bold text-gray-900 mt-0.5">{formatDateSimple(subscription.end_date)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Duración</span>
                  <div className="font-bold text-gray-900 mt-0.5">{(subscription as any).subscription_plans?.duration_in_days >= 10000 ? 'Ilimitado' : `${(subscription as any).subscription_plans?.duration_in_days || 0} días`}</div>
                </div>
              </div>

              {(subscription as any).subscription_plans?.features && (() => {
                const plan = subscription.subscription_plans as SubscriptionPlan;
                const features = getFeaturesList(plan);
                if (features.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Características incluidas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {subscription.auto_renew && (
                <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  Renovación automática activada
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Crown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No tienes una suscripción activa
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Selecciona uno de los planes disponibles para activar tu suscripción y desbloquear todas las funcionalidades.
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const features = getFeaturesList(plan);
              const isFree = plan.price === 0;
              return (
                <Card key={plan.id} className={cn("relative flex flex-col border-2", isFree ? "border-gray-200" : "border-primary/20")}>
                  {!isFree && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/20">
                      {plan.duration_in_days >= 10000 ? 'Ilimitado' : `${plan.duration_in_days} días`}
                    </div>
                  )}
                  <CardHeader className={cn("pb-4", !isFree && "pt-6")}>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex flex-col flex-1">
                    <div className="text-center">
                      <span className="text-4xl font-black text-primary">${plan.price.toLocaleString('es-CO')}</span>
                      {!isFree && <span className="text-sm text-gray-400 ml-1">/{plan.duration_in_days === 30 ? 'mes' : plan.duration_in_days === 365 ? 'año' : `${plan.duration_in_days}días`}</span>}
                    </div>

                    {features.length > 0 && (
                      <ul className="space-y-2.5 flex-1">
                        {features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span className="text-gray-600 leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className={cn("w-full font-bold", isFree ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/25")}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setShowConfirmModal(true);
                      }}
                      disabled={renewing || (subscription?.status === 'pending') || pendingPayments.length > 0}
                    >
                      {renewing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                      ) : (
                        <><CreditCard className="w-4 h-4 mr-2" /> {subscription ? 'Solicitar Renovación' : 'Activar Plan'}</>
                      )}
                    </Button>
                    {(subscription?.status === 'pending') && (
                      <p className="text-xs text-amber-600 text-center">
                        No puedes modificar la suscripción mientras está en validación.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
            <p className="text-gray-600 mb-2">
              {isSubscriptionActive() ? (
                "Tienes una suscripción activa. Si adquieres este plan se perderán los días restantes de tu plan actual. La nueva suscripción iniciará una vez que el administrador valide el pago."
              ) : (
                "El plan se renovará una vez que el administrador valide el pago."
              )}
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> No se realizará ningún cobro automático. Tu solicitud quedará en estado pendiente y el administrador se pondrá en contacto contigo para coordinar el pago.
              </p>
            </div>
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
                    toast.success('Renovación solicitada', {
                      description: 'Tu solicitud quedó en estado pendiente. El administrador validará el pago y activará tu suscripción pronto.',
                      duration: 6000,
                    });
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
                  "Solicitar Renovación"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}