import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { gsap } from '@/lib/gsap';

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
    description: 'Perfecto para probar la plataforma sin compromiso. Gestiona hasta 5 reservas diarias.',
    price: 0,
    duration_in_days: 36500,
    max_reservations: null,
    is_active: true,
    features: [
      'Hasta 5 reservas diarias',
      '1 Sede / Organización',
      'Recordatorios por correo',
      'Panel de administración móvil',
      'Sin costo, para siempre'
    ]
  },
  {
    id: 'static-basico',
    name: 'Plan Emprendedor',
    description: 'Perfecto para profesionales independientes y locales pequeños que inician su digitalización.',
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
    name: 'Plan Profesional',
    description: 'La opción más popular para negocios en crecimiento que necesitan automatización y reservas ilimitadas.',
    price: 99000,
    duration_in_days: 30,
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
    name: 'Plan Corporativo',
    description: 'Solución integral para franquicias y grandes establecimientos con necesidades avanzadas.',
    price: 189000,
    duration_in_days: 30,
    max_reservations: null,
    is_active: true,
    features: [
      'Reservas y sedes ilimitadas',
      'Todo lo del Plan Profesional',
      'Dominio y branding personalizado',
      'Asistente de implementación dedicado',
      'API de integración personalizada',
      'SLA garantizado y soporte telefónico'
    ]
  }
];

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
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
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
      } catch (e) {}
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
            Precios simples y transparentes
          </h2>
          <p className="text-base md:text-lg text-slate-500 leading-relaxed">
            Impulsa la ocupación de tu local, automatiza los recordatorios y ofrece una experiencia de reservas excepcional sin complicaciones técnicas.
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
            {plans.map((plan, index) => {
              const isPopular = index === 2; // Profesional es el recomendado
              const features = getFeaturesList(plan);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 border bg-white ${
                    isPopular
                      ? 'border-indigo-600 shadow-2xl md:scale-105 z-10'
                      : 'border-slate-200/80 shadow-sm hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                      <Sparkles className="h-3.5 w-3.5" />
                      Recomendado
                    </span>
                  )}

                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                      <p className="text-sm text-slate-500 min-h-[40px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex items-baseline mb-6 border-b border-slate-100 pb-6">
                      <span className="text-3xl md:text-4xl font-extrabold text-slate-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-sm text-slate-400 font-medium ml-2">
                        / {plan.duration_in_days >= 10000 ? 'Ilimitado' : `${plan.duration_in_days} días`}
                      </span>
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

                  <Button
                    onClick={() => handleWhatsappRedirect(plan.name)}
                    className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:scale-[1.02] ${
                      isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contratar Plan
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
