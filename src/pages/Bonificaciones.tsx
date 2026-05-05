import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Gift,
  ArrowRight,
  Info,
  Sparkles,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function BonificacionesUsuario() {
  const { profile, terminology } = useAuth();
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
      const { data: bonusConfigs } = await supabase
        .from('bonus_configs')
        .select('*, common_areas(name, image_url)')
        .eq('organization_id', profile?.organization_id)
        .eq('is_active', true);

      setConfigs(bonusConfigs || []);

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
    <div className="space-y-3 md:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header compacto con gradiente */}
      <div className="bg-gradient-to-r from-primary/10 to-indigo-100 p-4 md:p-6 rounded-2xl border border-white shadow-sm flex items-center gap-3">
        <div className="bg-white p-2.5 md:p-3 rounded-full shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300">
          <Gift className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-extrabold text-gray-900 tracking-tight truncate">Mis Recompensas</h1>
          <p className="text-[11px] md:text-sm text-gray-600 line-clamp-1 leading-relaxed">
            Completa {terminology.reservationLabel.toLowerCase()}s y obtén descuentos exclusivos
          </p>
        </div>
      </div>

      {/* Grid de Bonificaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        {configs.length === 0 ? (
          <div className="col-span-full py-10 text-center bg-white rounded-2xl border border-dashed border-gray-200 shadow-inner">
            <Gift className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No hay bonificaciones activas</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
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
            const remaining = goal - progress;

            return (
              <Card
                key={config.id}
                className={cn(
                  "border-none shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group h-full rounded-2xl",
                  hasDiscount ? "ring-2 ring-emerald-500 bg-gradient-to-br from-emerald-50/80 to-white" : "bg-white"
                )}
              >
                {area?.image_url && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none grayscale group-hover:opacity-10 transition-opacity duration-500">
                    <img src={area.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <CardContent className="p-3.5 md:p-5 space-y-3 relative z-10">
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <div className="bg-primary/10 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Gift className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    {hasDiscount ? (
                      <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-200 flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        LISTO
                      </div>
                    ) : (
                      <div className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {config.discount_percentage}% OFF
                      </div>
                    )}
                  </div>

                  {/* Area name */}
                  <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight">{area?.name}</h3>

                  {/* Progress */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-black text-gray-900 leading-none">
                        {progress}<span className="text-sm text-gray-400 font-normal">/{goal}</span>
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{terminology.reservationLabel}s</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg md:text-xl font-black text-primary">{config.discount_percentage}%</p>
                      <p className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-widest">Descuento</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-50">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                        hasDiscount ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-primary"
                      )}
                      style={{ width: `${hasDiscount ? 100 : progressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                    <p className="text-[10px] md:text-[11px] text-gray-500 flex items-start gap-1.5 leading-relaxed">
                      <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      {hasDiscount
                        ? `¡Felicidades! ${config.discount_percentage}% de descuento en tu próxima reserva.`
                        : `Completa ${remaining} ${terminology.reservationLabel.toLowerCase()}${remaining !== 1 ? 's' : ''} más para desbloquear ${config.discount_percentage}% OFF.`}
                    </p>
                  </div>

                  {/* CTA */}
                  <Button
                    className={cn(
                      "w-full h-9 md:h-10 rounded-xl text-xs font-bold active:scale-95 transition-all duration-300 hover:scale-[1.02]",
                      hasDiscount
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                        : "shadow-lg shadow-primary/20 hover:shadow-primary/40"
                    )}
                    onClick={() => navigate('/reservations/new')}
                  >
                    {hasDiscount ? 'Usar descuento' : 'Reservar ahora'}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Info Section */}
      <Card className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white border-none rounded-2xl relative overflow-hidden group shadow-xl">
        <div className="absolute top-0 right-0 p-6 opacity-[0.06] group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
          <Trophy className="w-28 h-28" />
        </div>
        <CardContent className="p-4 md:p-5 relative z-10">
          <h3 className="text-sm md:text-base font-black flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            ¿Cómo funcionan las metas?
          </h3>
          <div className="grid grid-cols-2 gap-2 md:gap-3 text-[10px] md:text-xs text-indigo-100 font-medium">
            <div className="flex gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black">1</div>
              <p>Reserva cualquier servicio disponible.</p>
            </div>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black">2</div>
              <p>El admin aprueba tu {terminology.reservationLabel.toLowerCase()} una vez pagada.</p>
            </div>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black">3</div>
              <p>El sistema suma tu progreso por cada servicio.</p>
            </div>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-amber-400 text-indigo-900 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black">4</div>
              <p>Al llegar a la meta, obtén el descuento aplicado.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
