import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Check, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_in_days: number;
  max_reservations: number | null;
  features: any;
  is_active: boolean;
}

const STATIC_PLANS: SubscriptionPlan[] = [
  {
    id: 'static-gratuito',
    name: 'Plan Gratuito',
    description: 'Empieza sin riesgo. Ideal para conocer la plataforma, gestionar tu agenda online y recibir tus primeras reservas.',
    price: 0,
    duration_in_days: 36500,
    max_reservations: null,
    is_active: true,
    features: [
      'Hasta 3 reservas diarias',
      '1 Sede / Organización',
      'Recordatorios por correo',
      'Panel de administración móvil',
      'Sin tarjeta de crédito'
    ]
  },
  {
    id: 'static-basico',
    name: 'Plan Mensual',
    description: 'La forma flexible de digitalizar tu negocio. Paga mes a mes mientras creces con un sistema de reservas profesional.',
    price: 49000,
    duration_in_days: 30,
    max_reservations: 300,
    is_active: true,
    features: [
      'Hasta 300 reservas mensuales',
      '1 Sede / Organización',
      'Recordatorios por correo',
      'Soporte técnico por correo',
      'Panel de administración móvil'
    ]
  },
  {
    id: 'static-pro',
    name: 'Plan Trimestral',
    description: 'El equilibrio perfecto entre inversión y ahorro. La opción recomendada para negocios que ya toman reservas todos los días.',
    price: 99000,
    duration_in_days: 90,
    max_reservations: null,
    is_active: true,
    features: [
      'Reservas ilimitadas',
      'Hasta 3 sedes o locales',
      'Recordatorios por WhatsApp automáticos',
      'Pasarela de pago integrada',
      'Reportes y analíticas de ocupación',
      'Soporte prioritario 24/7'
    ]
  },
  {
    id: 'static-premium',
    name: 'Plan Anual',
    description: 'La mejor inversión para tu negocio. Ahorra mes a mes con la tranquilidad de tener tu operación asegurada todo el año.',
    price: 189000,
    duration_in_days: 365,
    max_reservations: null,
    is_active: true,
    features: [
      'Reservas y sedes ilimitadas',
      'Todo lo del Plan Trimestral',
      'Dominio y branding personalizado',
      'Asistente de implementación dedicado',
      'API de integración personalizada',
      'SLA garantizado y soporte telefónico'
    ]
  }
];

const PLAN_LABELS: Record<string, { cta: string; note?: string }> = {
  'Plan Gratuito': { cta: 'Crear cuenta gratis', note: 'Sin compromiso' },
  'Plan Mensual': { cta: 'Contratar mensual', note: 'Ideal para comenzar' },
  'Plan Trimestral': { cta: 'Contratar trimestral', note: 'Recomendado' },
  'Plan Anual': { cta: 'Contratar anual', note: 'Mayor ahorro' },
  'Plan Emprendedor': { cta: 'Contratar plan', note: 'Ideal para comenzar' },
  'Plan Profesional': { cta: 'Contratar plan', note: 'Recomendado' },
  'Plan Corporativo': { cta: 'Hablar con ventas', note: 'Para grandes equipos' },
};

export function PricingSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('id, name, description, price, duration_in_days, max_reservations, features, is_active')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setPlans(data as SubscriptionPlan[]);
        } else {
          setPlans(STATIC_PLANS);
        }
      } catch (err) {
        console.error('Error fetching plans, falling back to static:', err);
        setPlans(STATIC_PLANS);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (loading || reducedMotion || !sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.children;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.85, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'back.out(1.2)',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 85%',
            end: 'bottom 15%',
            toggleActions: 'play reverse restart reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, reducedMotion]);

  const handleWhatsappRedirect = (planName: string) => {
    const message = `Hola, estoy interesado en registrar una nueva organización con la suscripción ${planName} de GoGi Reservas.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/573128470944?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const getPlanMeta = (planName: string) => {
    return PLAN_LABELS[planName] || { cta: 'Contratar plan' };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getFeaturesList = (plan: SubscriptionPlan): string[] => {
    if (!plan.features) return [];
    if (Array.isArray(plan.features)) return plan.features;
    if (typeof plan.features === 'object') {
      return Object.values(plan.features).filter((f) => typeof f === 'string') as string[];
    }
    if (typeof plan.features === 'string') {
      try {
        const parsed = JSON.parse(plan.features);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // JSON parsing failed; return empty list below
      }
    }
    return [];
  };

  return (
    <section
      ref={sectionRef}
      id="precios"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-slate-50 overflow-hidden"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-24">
          <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-full">
            Planes flexibles
          </span>
          <h2 className="text-2xl md:text-5xl font-semibold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6">
            Elige el plan que haga crecer tu negocio.
          </h2>
          <p className="text-base md:text-lg text-slate-500 leading-relaxed">
            Desde una prueba gratuita hasta una operación profesional. Cada plan está pensado para acompañarte en la etapa actual de tu negocio.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Cargando planes de suscripción...</p>
          </div>
        ) : (
          <div
            ref={cardsRef}
            className="grid md:grid-cols-4 gap-8 items-stretch max-w-6xl mx-auto"
          >
            {plans.map((plan) => {
              const isPopular = /trimestral|profesional/i.test(plan.name);
              const isFree = plan.price === 0;
              const features = getFeaturesList(plan);
              const meta = getPlanMeta(plan.name);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-[2rem] p-8 transition-all duration-500 border bg-white ${isPopular
                    ? 'border-slate-900 ring-1 ring-slate-900 shadow-xl md:scale-105 z-10'
                    : 'border-slate-200/60 shadow-sm hover:border-slate-350/80 hover:shadow-md'
                    }`}
                >
                  {isPopular && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-md border border-slate-800">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Recomendado
                    </span>
                  )}

                  <div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                        {meta.note && (
                          <span className={cn(
                            'text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                            isPopular ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          )}>
                            {meta.note}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 min-h-[40px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mb-6 border-b border-slate-100 pb-6">
                      <div className="flex items-baseline justify-center gap-x-1.5">
                        <span className="text-3xl md:text-4xl font-extrabold text-slate-900">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                          / {plan.duration_in_days >= 10000 ? 'para siempre' : `${plan.duration_in_days} días`}
                        </span>
                      </div>
                      {(() => {
                        const monthlyPlans = plans.filter(p => p.duration_in_days === 30 && p.price > 0 && p.id !== plan.id);
                        const months = plan.duration_in_days === 365 ? 12 : Math.round(plan.duration_in_days / 30);
                        if (plan.duration_in_days > 30 && plan.duration_in_days < 10000 && plan.price > 0 && monthlyPlans.length > 0) {
                          const monthlyEquivalent = plan.price / months;
                          const refPlan = monthlyPlans.find(p => {
                            const baseName = p.name.replace(/\s*(Trimestral|Anual|Mensual|Semestral)$/i, '').trim();
                            const planBase = plan.name.replace(/\s*(Trimestral|Anual|Mensual|Semestral)$/i, '').trim();
                            return baseName === planBase;
                          });
                          if (refPlan) {
                            const discount = Math.round((1 - monthlyEquivalent / refPlan.price) * 100);
                            if (discount > 0) {
                              return (
                                <>
                                  <div className="text-sm text-emerald-600 font-bold mt-1">
                                    {formatPrice(Math.round(monthlyEquivalent))}/mes
                                  </div>
                                  <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                                    Ahorra {discount}%
                                  </span>
                                </>
                              );
                            }
                          }
                          return (
                            <div className="text-sm text-slate-500 mt-1">
                              {formatPrice(Math.round(monthlyEquivalent))}/mes
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <ul className="space-y-4 mb-8">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-slate-600 leading-relaxed">
                          <Check className="h-5 w-5 text-emerald-500 shrink-0 mr-3 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isFree ? (
                    <Button
                      asChild
                      className={`w-full h-12 rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${isPopular
                        ? 'bg-slate-900 text-white hover:bg-slate-950 shadow-md border border-slate-900'
                        : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                      <Link to="/register">
                        {meta.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleWhatsappRedirect(plan.name)}
                      className={`w-full h-12 rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${isPopular
                        ? 'bg-slate-900 text-white hover:bg-slate-950 shadow-lg shadow-slate-900/10 border border-slate-900'
                        : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                      {meta.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
