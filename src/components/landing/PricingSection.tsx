import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Check, Loader2, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
  features: unknown;
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
  const [activePlanId, setActivePlanId] = useState<string>('');
  const [mobileCanGoPrev, setMobileCanGoPrev] = useState(false);
  const [mobileCanGoNext, setMobileCanGoNext] = useState(true);
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
            toggleActions: 'play none none reset',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, reducedMotion]);

  useEffect(() => {
    if (loading || !cardsRef.current || !sectionRef.current || window.innerWidth >= 768) return;

    const scroller = cardsRef.current;
    let nudgeTween: gsap.core.Timeline | undefined;

    const updateHint = () => {
      const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      const distanceToEnd = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
      const closestCard = Array.from(scroller.children).reduce<HTMLElement | null>((closest, child) => {
        const card = child as HTMLElement;
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const closestDistance = closest ? Math.abs(closest.offsetLeft + closest.offsetWidth / 2 - scrollerCenter) : Infinity;
        return Math.abs(cardCenter - scrollerCenter) < closestDistance ? card : closest;
      }, null);

      setActivePlanId(closestCard?.dataset.planId || '');
      setMobileCanGoPrev(scroller.scrollLeft > 24);
      setMobileCanGoNext(distanceToEnd > 24);
    };

    updateHint();
    scroller.addEventListener('scroll', updateHint, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Trigger only on mobile when section becomes visible and at initial scroll position
        if (window.innerWidth >= 768 || !entry.isIntersecting || reducedMotion || scroller.scrollLeft > 8) return;
        // Calculate target scroll to second card
        const children = Array.from(scroller.children) as HTMLElement[];
        const secondCard = children[1];
        let targetScroll = 0;
        if (secondCard) {
          targetScroll = Math.max(0, secondCard.offsetLeft - 16);
        } else {
          const firstCard = scroller.firstElementChild as HTMLElement | null;
          targetScroll = (firstCard?.offsetWidth || window.innerWidth * 0.8) + 16;
        }
        // Perform nudge animation: scroll to second card then back to first
        nudgeTween = gsap.timeline({ delay: 0.4 })
          .to(scroller, { scrollLeft: targetScroll, duration: 0.75, ease: 'power2.inOut' })
          .to(scroller, { scrollLeft: 0, duration: 0.75, ease: 'power2.inOut', delay: 0.15 });
      },
      { threshold: 0.3 }
    );

    observer.observe(sectionRef.current);

    return () => {
      nudgeTween?.kill();
      observer.disconnect();
      scroller.removeEventListener('scroll', updateHint);
    };
  }, [loading, reducedMotion, plans.length]);

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

  const getPlanBaseName = (planName: string) => {
    return planName.replace(/\s*(Trimestral|Anual|Mensual|Semestral)$/i, '').trim();
  };

  const getMonthlyEquivalent = (plan: SubscriptionPlan) => {
    const months = plan.duration_in_days === 365 ? 12 : Math.round(plan.duration_in_days / 30);
    return plan.price / months;
  };

  const getMonthlyReferencePlan = (plan: SubscriptionPlan) => {
    const monthlyPlans = plans.filter(p => p.duration_in_days === 30 && p.price > 0 && p.id !== plan.id);
    return monthlyPlans.find(p => getPlanBaseName(p.name) === getPlanBaseName(plan.name));
  };

  const getPlanDiscount = (plan: SubscriptionPlan) => {
    if (plan.duration_in_days <= 30 || plan.duration_in_days >= 10000 || plan.price <= 0) return null;

    const refPlan = getMonthlyReferencePlan(plan);
    if (!refPlan) return null;

    const discount = Math.round((1 - getMonthlyEquivalent(plan) / refPlan.price) * 100);
    return discount > 0 ? discount : null;
  };

  const getPlanShortcutLabel = (plan: SubscriptionPlan) => {
    if (/mensual/i.test(plan.name) || plan.duration_in_days === 30) return 'Mensual';
    if (/trimestral/i.test(plan.name) || plan.duration_in_days === 90) return 'Trimestral';
    if (/anual/i.test(plan.name) || plan.duration_in_days === 365) return 'Anual';
    return plan.name.replace(/^Plan\s+/i, '');
  };

  const getShortcutPlans = () => {
    const order = [30, 90, 365];
    return plans
      .filter(plan => plan.price > 0 && (order.includes(plan.duration_in_days) || /mensual|trimestral|anual/i.test(plan.name)))
      .sort((a, b) => {
        const aOrder = order.indexOf(a.duration_in_days);
        const bOrder = order.indexOf(b.duration_in_days);
        return (aOrder === -1 ? 99 : aOrder) - (bOrder === -1 ? 99 : bOrder);
      });
  };

  const scrollToPlan = (planId: string) => {
    const card = cardsRef.current?.querySelector(`[data-plan-id="${planId}"]`) as HTMLElement | null;
    if (!card) return;

    setActivePlanId(planId);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const scrollPricingCard = (direction: 'prev' | 'next') => {
    if (!cardsRef.current) return;

    const cards = Array.from(cardsRef.current.children) as HTMLElement[];
    const currentIndex = Math.max(0, cards.findIndex(card => card.dataset.planId === activePlanId));
    const targetIndex = direction === 'next'
      ? Math.min(cards.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
    const targetCard = cards[targetIndex];

    if (!targetCard) return;
    setActivePlanId(targetCard.dataset.planId || '');
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
      className="relative py-12 md:py-32 px-5 md:px-6 bg-slate-50 overflow-hidden"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-24">
          <span className="text-xs font-bold tracking-widest text-slate-800 uppercase bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
            Suscripción y tarifas
          </span>
          <h2 className="text-2xl md:text-5xl font-bold text-slate-900 tracking-tight mt-4 mb-3 md:mb-6">
            Planes adaptados al volumen de reservas de tu negocio.
          </h2>
          <p className="text-sm md:text-lg text-slate-500 leading-relaxed">
            Comienza con nuestra versión gratuita o escala a planes avanzados con recordatorios automáticos por WhatsApp y múltiples especialistas.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Cargando planes de suscripción...</p>
          </div>
        ) : (
          <div className="relative">
            <div className="mb-4 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide md:hidden">
              {getShortcutPlans().map((plan) => {
                const discount = getPlanDiscount(plan);
                const isActive = activePlanId === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => scrollToPlan(plan.id)}
                    className={cn(
                      'flex min-w-[6.8rem] shrink-0 items-center justify-center rounded-full border px-3 py-2 text-xs font-bold transition-all duration-300 md:min-w-[8rem] md:px-4 md:text-sm',
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10'
                        : 'border-white/70 bg-white/70 text-slate-700 shadow-sm backdrop-blur-xl hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-slate-950'
                    )}
                    aria-label={`Ver ${plan.name}`}
                  >
                    <span>{getPlanShortcutLabel(plan)}</span>
                    {discount && (
                      <span className={cn(
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold md:ml-2 md:px-2 md:text-[10px]',
                        isActive ? 'bg-white/15 text-emerald-200' : 'bg-emerald-50 text-emerald-600'
                      )}>
                        -{discount}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div
              ref={cardsRef}
              className="flex md:grid md:grid-cols-4 gap-4 md:gap-8 items-stretch max-w-6xl mx-auto overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-5 px-5 md:mx-auto md:px-0 pt-5 md:pt-0 pb-5 md:pb-0"
            >
              {plans.map((plan) => {
                const isPopular = /trimestral|profesional/i.test(plan.name);
                const isFree = plan.price === 0;
                const features = getFeaturesList(plan);
                const meta = getPlanMeta(plan.name);

                return (
                  <div
                    key={plan.id}
                    data-plan-id={plan.id}
                    className={`relative flex w-[82vw] max-w-[20rem] shrink-0 snap-center flex-col justify-between rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 transition-all duration-500 border bg-white md:w-auto md:max-w-none ${isPopular
                      ? 'border-slate-900 ring-1 ring-slate-900 shadow-xl md:scale-105 z-10'
                      : 'border-slate-200/60 shadow-sm hover:border-slate-350/80 hover:shadow-md'
                      }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] md:text-xs font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-full flex items-center gap-1 shadow-md border border-slate-800">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        Recomendado
                      </span>
                    )}

                    <div>
                      <div className="mb-4 md:mb-6">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-slate-900">{plan.name}</h3>
                          {meta.note && (
                            <span className={cn(
                              'text-[10px] md:text-xs font-semibold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full whitespace-nowrap',
                              isPopular ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                            )}>
                              {meta.note}
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-slate-500 min-h-0 md:min-h-[40px] leading-relaxed line-clamp-2 md:line-clamp-none">
                          {plan.description}
                        </p>
                      </div>

                      <div className="mb-4 md:mb-6 border-b border-slate-100 pb-4 md:pb-6">
                        <div className="flex items-baseline justify-center gap-x-1.5">
                          <span className="text-2xl md:text-4xl font-extrabold text-slate-900">
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            / {plan.duration_in_days >= 10000 ? 'para siempre' : `${plan.duration_in_days} días`}
                          </span>
                        </div>
                        {(() => {
                          if (plan.duration_in_days > 30 && plan.duration_in_days < 10000 && plan.price > 0) {
                            const monthlyEquivalent = getMonthlyEquivalent(plan);
                            const discount = getPlanDiscount(plan);

                            if (discount) {
                              return (
                                <>
                                  <div className="text-xs md:text-sm text-emerald-600 font-bold mt-1">
                                    {formatPrice(Math.round(monthlyEquivalent))}/mes
                                  </div>
                                  <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 md:px-3 py-1 rounded-full shadow-lg">
                                    Ahorra {discount}%
                                  </span>
                                </>
                              );
                            }

                            return (
                              <div className="text-xs md:text-sm text-slate-500 mt-1">
                                {formatPrice(Math.round(monthlyEquivalent))}/mes
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <ul className="space-y-2 md:space-y-4 mb-5 md:mb-8">
                        {features.map((feature, idx) => (
                          <li key={idx} className="flex items-start text-xs md:text-sm text-slate-600 leading-relaxed">
                            <Check className="h-4 w-4 md:h-5 md:w-5 text-emerald-500 shrink-0 mr-2 md:mr-3 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isFree ? (
                      <Button
                        asChild
                        className={`w-full h-11 md:h-12 rounded-full flex items-center justify-center gap-2 text-sm md:text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${isPopular
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
                        className={`w-full h-11 md:h-12 rounded-full flex items-center justify-center gap-2 text-sm md:text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${isPopular
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
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex w-screen -translate-x-1/2 -translate-y-1/2 items-center justify-between px-2 md:hidden">
              <button
                type="button"
                onClick={() => scrollPricingCard('prev')}
                disabled={!mobileCanGoPrev}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 shadow-md shadow-slate-900/5 backdrop-blur-xl transition-all active:scale-95 disabled:opacity-0 disabled:active:scale-100"
                aria-label="Ver plan anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollPricingCard('next')}
                disabled={!mobileCanGoNext}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 shadow-md shadow-slate-900/5 backdrop-blur-xl transition-all active:scale-95 disabled:opacity-0 disabled:active:scale-100"
                aria-label="Ver plan siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        {!loading && (
          <div className="mt-2 flex items-center justify-center md:hidden">
            <p className="text-center text-[11px] font-medium text-slate-400">
              Desliza para comparar los planes
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
