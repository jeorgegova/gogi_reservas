/**
 * FeaturesSection
 * Sección con pin y scrollytelling al estilo Apple.
 * En desktop: una columna visual permanece fija mientras el contenido textual cambia.
 * En móvil: se utiliza un layout apilado más compacto con animaciones simplificadas.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Calendar, Shield, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    id: 'realtime',
    icon: Calendar,
    title: 'Reservas en tiempo real',
    description:
      'Visualiza la disponibilidad al instante. Sin esperas, sin confusiones. Solo un flujo natural hacia tu próxima reserva.',
    color: 'from-indigo-500 to-blue-600',
    lightColor: 'bg-indigo-50',
  },
  {
    id: 'control',
    icon: Shield,
    title: 'Control total',
    description:
      'Gestiona usuarios, recursos, horarios y pagos desde un panel centralizado diseñado para la claridad absoluta.',
    color: 'from-emerald-500 to-teal-600',
    lightColor: 'bg-emerald-50',
  },
  {
    id: 'automation',
    icon: Zap,
    title: 'Automatización inteligente',
    description:
      'Validaciones, recordatorios y confirmaciones que suceden en el momento exacto, reduciendo la carga administrativa.',
    color: 'from-amber-500 to-orange-600',
    lightColor: 'bg-amber-50',
  },
  {
    id: 'experience',
    icon: Users,
    title: 'Para cada industria',
    description:
      'Desde conjuntos residenciales hasta barberías, salones y talleres. La plataforma se adapta a tu lenguaje y ritmo.',
    color: 'from-rose-500 to-pink-600',
    lightColor: 'bg-rose-50',
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !sectionRef.current || !pinRef.current || !cardsRef.current || !visualRef.current) return;

      const cards = cardsRef.current.querySelectorAll('[data-feature-card]');
      const icons = visualRef.current.querySelectorAll('[data-feature-icon]');

      const mm = gsap.matchMedia({
        // Desktop: experiencia pinned con scrollytelling
        '(min-width: 1024px)': function () {
          const ctx = gsap.context(() => {
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top top',
                end: '+=300%',
                pin: pinRef.current,
                scrub: 0.6,
              },
            });

            cards.forEach((card, index) => {
              const isFirst = index === 0;
              const prevCard = cards[index - 1];

              if (!isFirst && prevCard) {
                tl.to(
                  prevCard,
                  {
                    opacity: 0,
                    y: -60,
                    filter: 'blur(8px)',
                    duration: 0.25,
                    ease: 'power2.inOut',
                  },
                  index - 0.75
                );
              }

              tl.fromTo(
                card,
                {
                  opacity: isFirst ? 1 : 0,
                  y: isFirst ? 0 : 80,
                  filter: isFirst ? 'blur(0px)' : 'blur(12px)',
                },
                {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  duration: 0.25,
                  ease: 'power2.out',
                },
                index
              );

              icons.forEach((icon, iconIndex) => {
                tl.to(
                  icon,
                  {
                    scale: iconIndex === index ? 1 : 0.6,
                    opacity: iconIndex === index ? 1 : 0.2,
                    y: iconIndex === index ? 0 : 20,
                    duration: 0.25,
                    ease: 'power2.inOut',
                  },
                  index
                );
              });
            });
          }, sectionRef);

          return () => ctx.revert();
        },
        // Tablet y móvil: animaciones simplificadas sin pin
        '(max-width: 1023px)': function () {
          const ctx = gsap.context(() => {
            cards.forEach((card) => {
              gsap.fromTo(
                card,
                { opacity: 0, y: 50 },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.8,
                  ease: 'power2.out',
                  scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    end: 'top 55%',
                    scrub: 0.5,
                  },
                }
              );
            });

            icons.forEach((icon) => {
              gsap.set(icon, { opacity: 1, scale: 1, y: 0 });
            });
          }, sectionRef);

          return () => ctx.revert();
        },
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  return (
    <section
      ref={sectionRef}
      className="relative bg-white"
      style={{ height: reducedMotion ? 'auto' : '400vh' }}
    >
      {reducedMotion ? (
        <div className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 mb-12 md:mb-16 text-center">
            Todo lo que necesitas.
          </h2>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.id} className="p-6 md:p-8 rounded-3xl bg-slate-50">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 mb-4 text-slate-700" />
                  <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm md:text-base">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          ref={pinRef}
          className="lg:h-screen w-full flex items-center justify-center px-5 md:px-6 py-16 md:py-24 lg:py-0"
        >
          <div className="max-w-7xl w-full mx-auto grid lg:grid-cols-2 gap-10 md:gap-12 lg:gap-24 items-center">
            {/* Visual */}
            <div
              ref={visualRef}
              className="relative aspect-[4/3] lg:aspect-square max-w-sm mx-auto w-full rounded-[2rem] lg:rounded-[3rem] bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl shadow-slate-900/20 overflow-hidden order-1 lg:order-1"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.2),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(244,63,94,0.12),transparent_50%)]" />

              <div className="relative h-full flex flex-col items-center justify-center p-6 lg:p-8">
                {FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      data-feature-icon
                      className={cn(
                        'absolute inset-0 flex items-center justify-center transition-opacity',
                        index === 0 ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      <div
                        className={cn(
                          'h-20 w-20 md:h-28 md:w-28 lg:h-32 lg:w-32 rounded-2xl lg:rounded-3xl bg-gradient-to-br flex items-center justify-center shadow-2xl',
                          feature.color
                        )}
                      >
                        <Icon className="h-8 w-8 md:h-12 md:w-12 lg:h-14 lg:w-14 text-white" strokeWidth={1.2} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tarjetas de contenido */}
            <div ref={cardsRef} className="relative lg:h-[300px]">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    data-feature-card
                    className={cn(
                      'lg:absolute lg:inset-0 flex flex-col justify-center will-change-transform',
                      index === 0 ? 'opacity-100' : 'opacity-100 lg:opacity-0',
                      'mb-10 md:mb-12 lg:mb-0 last:mb-0'
                    )}
                  >
                    <div
                      className={cn(
                        'h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 md:mb-6',
                        feature.color
                      )}
                    >
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-slate-900 tracking-tight mb-3 md:mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-base md:text-lg lg:text-xl text-slate-500 leading-relaxed max-w-lg">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
