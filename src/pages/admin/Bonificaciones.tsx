import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useCommonAreasQuery } from '@/hooks/useCommonAreas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Gift, 
  Settings, 
  Users, 
  Plus, 
  Trash2, 
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminBonificaciones() {
  const { profile } = useAuth();
  const [bonusSystemActive, setBonusSystemActive] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [reservationsRequired, setReservationsRequired] = useState(5);
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: areas = [] } = useCommonAreasQuery(profile?.organization_id);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchInitialData();
    }
  }, [profile?.organization_id]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Org Status
      const { data: org } = await supabase
        .from('organizations')
        .select('bonus_system_active')
        .eq('id', profile?.organization_id)
        .single();
      
      if (org) setBonusSystemActive(org.bonus_system_active);

      // 2. Fetch Configs
      const { data: bonusConfigs } = await supabase
        .from('bonus_configs')
        .select('*, common_areas(name)')
        .eq('organization_id', profile?.organization_id);
      
      setConfigs(bonusConfigs || []);

      // 3. Fetch Progress (Derived from reservations)
      await fetchProgress();

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchProgress = async () => {
    // Obtenemos todas las reservas aprobadas de la organización
    // Aseguramos el join correcto con profiles
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        user_id, 
        common_area_id, 
        profiles!inner(full_name, apartment)
      `)
      .eq('organization_id', profile?.organization_id)
      .eq('status', 'approved');

    if (error || !reservations) {
      console.error('Error fetching progress:', error);
      return;
    }

    // Agrupar por usuario y área
    const groups: Record<string, any> = {};
    reservations.forEach(res => {
      const profileData = res.profiles as any;
      const key = `${res.user_id}_${res.common_area_id}`;
      if (!groups[key]) {
        groups[key] = {
          userId: res.user_id,
          userName: profileData?.full_name || 'Sin nombre',
          apartment: profileData?.apartment || 'S/A',
          areaId: res.common_area_id,
          count: 0
        };
      }
      groups[key].count++;
    });

    setProgressData(Object.values(groups));
  };

  const handleToggleSystem = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ bonus_system_active: checked })
        .eq('id', profile?.organization_id);

      if (error) throw error;
      setBonusSystemActive(checked);
      toast.success(checked ? 'Sistema de bonificaciones activado' : 'Sistema de bonificaciones desactivado');
      
      // Forzar recarga de la página para que el layout actualice el menú
      // window.location.reload(); 
      // En una SPA real, usaríamos un context o state global para la org
    } catch (error) {
      console.error('Error updating system status:', error);
      toast.error('Error al actualizar el estado del sistema');
    }
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bonus_configs')
        .upsert({
          organization_id: profile?.organization_id,
          common_area_id: selectedAreaId,
          reservations_required: reservationsRequired,
          discount_percentage: discountPercentage,
          is_active: true
        });

      if (error) throw error;
      
      toast.success('Configuración guardada correctamente');
      fetchInitialData();
      // Reset form
      setSelectedAreaId('');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bonus_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Configuración eliminada');
      setConfigs(configs.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Error al eliminar');
    }
  };

  const filteredProgress = progressData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const areaName = areas.find(a => a.id === item.areaId)?.name || '';
    return (
      item.userName.toLowerCase().includes(searchLower) ||
      item.apartment.toLowerCase().includes(searchLower) ||
      areaName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary" />
            Módulo de Bonificaciones
          </h1>
          <p className="text-gray-500">Configura recompensas para tus residentes leales.</p>
        </div>
        
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Estado del Módulo</Label>
              <p className="text-xs text-gray-500">Activar para todos los usuarios</p>
            </div>
            <Switch 
              checked={bonusSystemActive} 
              onCheckedChange={handleToggleSystem}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </Card>
      </div>

      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-3 gap-8 transition-all duration-300",
        !bonusSystemActive && "opacity-50 pointer-events-none grayscale-[0.5]"
      )}>
        {/* Configuration Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Settings className="w-5 h-5 text-primary" />
                Nueva Configuración
              </CardTitle>
              <CardDescription>Define metas de reserva por área común.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label>Área Común</Label>
                  <select 
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm bg-white"
                    required
                  >
                    <option value="">Seleccionar área...</option>
                    {areas.map((area: any) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta Reservas</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={reservationsRequired}
                      onChange={(e) => setReservationsRequired(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descuento (%)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <Button className="w-full mt-4" type="submit" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Guardando...' : 'Crear Regla'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Active Rules & Monitoring */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Rules List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configs.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-xl border-2 border-dashed border-gray-100">
                <Gift className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No hay configuraciones activas aún.</p>
              </div>
            ) : (
              configs.map((config) => (
                <Card key={config.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      onClick={() => handleDeleteConfig(config.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <div className="bg-primary/10 w-fit p-2 rounded-lg mb-2">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-bold">{config.common_areas?.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center gap-4 mt-2">
                      <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                        {config.discount_percentage}% OFF
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Cada {config.reservations_required} reservas
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Monitoring Table */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Progreso de Usuarios
                  </CardTitle>
                  <CardDescription>Resumen de metas alcanzadas y reservas vigentes.</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Buscar residente o área..." 
                    className="pl-9 w-full md:w-64 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-medium uppercase text-[10px] tracking-wider border-b">
                      <th className="px-6 py-3">Usuario / Apt</th>
                      <th className="px-6 py-3">Área Común</th>
                      <th className="px-6 py-3">Reservas</th>
                      <th className="px-6 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProgress.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          No se encontraron datos de progreso.
                        </td>
                      </tr>
                    ) : (
                      filteredProgress.map((item, idx) => {
                        const config = configs.find(c => c.common_area_id === item.areaId);
                        const areaName = areas.find(a => a.id === item.areaId)?.name || 'Área desconocida';
                        const goal = config?.reservations_required || 5;
                        const progress = (item.count % goal);
                        const reached = item.count > 0 && progress === 0;
                        const percentage = (progress / goal) * 100;

                          return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-900">{item.userName}</p>
                                <p className="text-xs text-gray-500">Apt {item.apartment}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                                  {areaName}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {config ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{item.count}</span>
                                    <div className="hidden md:block w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className={cn(
                                          "h-full rounded-full transition-all duration-500",
                                          reached ? "bg-emerald-500 animate-pulse" : "bg-primary"
                                        )}
                                        style={{ width: `${reached ? 100 : percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500">{progress}/{goal}</span>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-xs italic flex items-center gap-1">
                                    <Gift className="w-3 h-3 opacity-30" />
                                    Sin bonificación asignada
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {config ? (
                                  reached ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                      <CheckCircle2 className="w-4 h-4" />
                                      META OK
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                                      <Clock className="w-4 h-4" />
                                      EN CURSO
                                    </div>
                                  )
                                ) : (
                                  <div className="text-gray-300 text-xs">-</div>
                                )}
                              </td>
                            </tr>
                          );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
