import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  XCircle,
  Crown,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { AlertDialog } from '@/components/ui/alert-dialog';

export default function SuperAdminSubscriptionPlans() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_in_days: '',
    max_reservations: '',
    max_reservations_per_day: '',
    features: ''
  });
  const [isUnlimitedDuration, setIsUnlimitedDuration] = useState(false);

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

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    setAlertConfig({
      open: true,
      title,
      description,
      onConfirm,
      variant,
      showCancel: true,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar'
    });
  };

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      fetchPlans();
    }
  }, [profile]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan: any = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price?.toString() || '',
        duration_in_days: plan.duration_in_days?.toString() || '',
        max_reservations: plan.max_reservations?.toString() || '',
        max_reservations_per_day: plan.max_reservations_per_day?.toString() || '',
        features: plan.features ? JSON.stringify(plan.features, null, 2) : ''
      });
      setIsUnlimitedDuration(plan.duration_in_days === 36500);
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration_in_days: '',
        max_reservations: '',
        max_reservations_per_day: '',
        features: ''
      });
      setIsUnlimitedDuration(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_in_days: parseInt(formData.duration_in_days),
        max_reservations: formData.max_reservations ? parseInt(formData.max_reservations) : null,
        max_reservations_per_day: formData.max_reservations_per_day ? parseInt(formData.max_reservations_per_day) : null,
        features: formData.features ? JSON.parse(formData.features) : null
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(dataToSave)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([dataToSave]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      showAlert('Error al guardar', error.message, 'destructive');
    } finally {
      setLoading(false);
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId);

      if (count && count > 0) {
        showConfirm(
          'No se puede eliminar este plan',
          `Este plan tiene ${count} suscripción(es) asociada(s). ¿Quieres desactivarlo en vez de eliminarlo?`,
          async () => {
            await supabase
              .from('subscription_plans')
              .update({ is_active: false })
              .eq('id', planId);
            fetchPlans();
          },
          'default'
        );
        return;
      }

      showConfirm(
        '¿Estás seguro de eliminar este plan?',
        'Esta acción no se puede deshacer.',
        async () => {
          const { error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', planId);

          if (error) throw error;
          fetchPlans();
        },
        'destructive'
      );
    } catch (error: any) {
      console.error('Error al eliminar plan:', error);
      showAlert('Error al eliminar', error.message, 'destructive');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Planes de Suscripción</h1>
            <p className="text-gray-500 text-sm">Gestión de planes disponibles para organizaciones.</p>
          </div>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25 h-9 rounded-xl text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nuevo Plan
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-visible">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/30 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duración</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Límite Diario</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td                       colSpan={6} className="px-6 py-6">
                        <div className="h-4 bg-gray-100 rounded-full w-full" />
                      </td>
                    </tr>
                  ))
                ) : plans.length === 0 ? (
                  <tr>
                    <td                       colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No hay planes de suscripción configurados.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-gray-900">{plan.name}</div>
                          {plan.description && (
                            <div className="text-[10px] text-gray-500 mt-1">{plan.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{formatCurrency(plan.price)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">{plan.duration_in_days >= 10000 ? 'Ilimitado' : `${plan.duration_in_days} días`}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">
                          {plan.max_reservations_per_day ? `${plan.max_reservations_per_day}/día` : 'Sin límite'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 text-[10px] font-bold border uppercase rounded-full",
                            plan.is_active
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-red-50 text-red-700 border-red-100"
                          )}
                        >
                          {plan.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Inactivo
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                            onClick={() => handleOpenModal(plan)}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            onClick={() => deletePlan(plan.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-24 bg-gray-100 rounded-xl w-full" />
                </div>
              ))
            ) : plans.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">
                No hay planes de suscripción configurados.
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0 pr-2">
                       <span className="font-bold text-gray-900 truncate text-lg">{plan.name}</span>
                       <span className="font-bold text-gray-900 mt-1">{formatCurrency(plan.price)}</span>
                    </div>
                    <button
                      onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold border uppercase rounded-full shrink-0",
                        plan.is_active
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-red-50 text-red-700 border-red-100"
                      )}
                    >
                      {plan.is_active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Activo
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Inactivo
                        </>
                      )}
                    </button>
                  </div>
                  
                  {plan.description && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">{plan.description}</div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col items-start gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duración</span>
                        <span className="font-semibold text-gray-700">{plan.duration_in_days >= 10000 ? 'Ilimitado' : `${plan.duration_in_days} días`}</span>
                     </div>
                     <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col items-start gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Límite Diario</span>
                        <span className="font-semibold text-gray-700">{plan.max_reservations_per_day ? `${plan.max_reservations_per_day}/día` : 'Sin límite'}</span>
                     </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg px-2"
                      onClick={() => handleOpenModal(plan)}
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg px-2"
                      onClick={() => deletePlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3 md:p-4 pt-0 md:pt-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
          style={{ paddingBottom: 'max(100px, env(safe-area-inset-bottom))' }}
        >
          <div className="bg-white rounded-t-2xl md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] md:max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-y-auto">
            <div className="px-4 md:px-8 pt-4 md:pt-8 pb-4 flex items-center shrink-0 justify-between border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</h2>
                <p className="text-gray-500 text-xs">Configura los detalles del plan de suscripción.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <XCircle className="w-5 h-5 text-gray-400" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-5 md:space-y-6 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Nombre del Plan</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Plan Básico"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Precio (COP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="50000"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Duración (días)</Label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUnlimitedDuration}
                        onChange={(e) => {
                          setIsUnlimitedDuration(e.target.checked);
                          if (e.target.checked) {
                            setFormData({ ...formData, duration_in_days: '36500' });
                          } else {
                            setFormData({ ...formData, duration_in_days: '' });
                          }
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Sin límite</span>
                    </label>
                  </div>
                  <Input
                    type="number"
                    value={formData.duration_in_days}
                    onChange={e => setFormData({ ...formData, duration_in_days: e.target.value })}
                    placeholder={isUnlimitedDuration ? '36500' : '30'}
                    disabled={isUnlimitedDuration}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Límite Diario (opcional)</Label>
                  <Input
                    type="number"
                    value={formData.max_reservations_per_day}
                    onChange={e => setFormData({ ...formData, max_reservations_per_day: e.target.value })}
                    placeholder="5"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Descripción</Label>
                <Input
                  value={formData.description}
                  onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del plan..."
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Características (JSON)</Label>
                <Input
                  value={formData.features}
                  onChange={(e: any) => setFormData({ ...formData, features: e.target.value })}
                  placeholder='{"reservas_ilimitadas": true, "soporte_24h": false}'
                  className="h-11 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="pt-4 md:pb-0 flex justify-end gap-3" style={{ paddingBottom: 'max(100px, env(safe-area-inset-bottom))' }}>
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px] rounded-xl font-bold shadow-lg shadow-purple-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPlan ? 'Guardar Cambios' : 'Crear Plan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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