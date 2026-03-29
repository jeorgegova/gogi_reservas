import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Gift, 
  Clock, 
  ArrowRight,
  Info,
  Sparkles,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function BonificacionesUsuario() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<any[]>([]);
  const [userReservations, setUserReservations] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id && profile?.organization_id) {
      fetchData();
    }
  }, [profile?.id, profile?.organization_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Configs
      const { data: bonusConfigs } = await supabase
        .from('bonus_configs')
        .select('*, common_areas(name, image_url)')
        .eq('organization_id', profile?.organization_id)
        .eq('is_active', true);
      
      setConfigs(bonusConfigs || []);

      // 2. Fetch User Reservations (Approved)
      const { data: reservations } = await supabase
        .from('reservations')
        .select('common_area_id')
        .eq('user_id', profile?.id)
        .eq('status', 'approved');

      setUserReservations(reservations || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAreaProgress = (areaId: string) => {
    return userReservations.filter(res => res.common_area_id === areaId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 to-indigo-100 p-8 rounded-2xl border border-white shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-white p-4 rounded-full shadow-md">
          <Gift className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mis Recompensas</h1>
          <p className="text-gray-600 max-w-xl">
            ¡Sigue reservando tus áreas favoritas! Al completar tus metas de reserva, obtendrás descuentos exclusivos en tus próximas solicitudes.
          </p>
        </div>
      </div>

      {/* Grid de Bonificaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Gift className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">No hay bonificaciones activas</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              Vuelve pronto para descubrir nuevas promociones y descuentos exclusivos.
            </p>
          </div>
        ) : (
          configs.map((config) => {
            const currentReservations = getAreaProgress(config.common_area_id);
            const goal = config.reservations_required;
            const progress = (currentReservations % goal);
            const hasDiscount = currentReservations > 0 && progress === 0;
            const progressPercent = (progress / goal) * 100;
            const area = config.common_areas;

            return (
              <Card 
                key={config.id} 
                className={cn(
                  "border-none shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group h-full",
                  hasDiscount ? "ring-2 ring-emerald-500 bg-emerald-50/10" : "bg-white"
                )}
              >
                {/* Background area image if exists */}
                {area?.image_url && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none grayscale">
                    <img src={area.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <CardHeader className="pb-4 pt-6 px-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                    {hasDiscount ? (
                      <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 animate-bounce">
                        <Sparkles className="w-3.5 h-3.5" />
                        DESCUENTO LISTO
                      </div>
                    ) : (
                      <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        EN PROGRESO
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl font-extrabold text-gray-900 line-clamp-1">{area?.name}</CardTitle>
                </CardHeader>

                <CardContent className="px-6 pb-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-3xl font-black text-gray-900">{progress}<span className="text-lg text-gray-400 font-normal">/{goal}</span></p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reservas realizadas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">{config.discount_percentage}%</p>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Descuento</p>
                      </div>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-50">
                      <div 
                        className={cn(
                          "absolute inset-y-0 left-0 transition-all duration-1000 ease-out",
                          hasDiscount ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-primary"
                        )}
                        style={{ width: `${hasDiscount ? 100 : progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600 flex items-start gap-2 leading-relaxed">
                      <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {hasDiscount 
                        ? `¡Felicidades! Se ha aplicado un ${config.discount_percentage}% de descuento a tu próxima reserva de este espacio.` 
                        : `Completa ${goal - progress} reserva(s) más para desbloquear un descuento del ${config.discount_percentage}% en tu siguiente visita.`}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="px-6 pb-6 mt-auto">
                  <Button 
                    className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                    onClick={() => navigate('/reservations/new')}
                  >
                    Reservar ahora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Info Section */}
      <Card className="bg-indigo-900 text-white border-none p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Trophy className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-3">
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              ¿Cómo funcionan las metas?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-100 font-medium">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                <p>Reserva cualquier área común disponible.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                <p>Asegúrate de que el administrador apruebe tu reserva una vez pagada.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                <p>El sistema suma automáticamente tu progreso por cada área.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 font-bold">4</div>
                <p>Al llegar a la meta, tu siguiente factura tendrá el descuento aplicado.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

