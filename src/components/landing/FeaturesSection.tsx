/**
 * FeaturesSection
 * Sección con pin y scrollytelling al estilo Apple.
 * En desktop: una columna visual permanece fija mientras el contenido textual cambia.
 * En móvil: se utiliza un layout apilado más compacto con animaciones simplificadas.
 */
import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { cn } from '@/lib/utils';
import { FloatingIcons } from './FloatingIcons';
import imgRealtime from '@/assets/ReservasEnTiempoReal.png';
import imgControl from '@/assets/ControlTotal.png';
import imgAutomation from '@/assets/AutomatizacionInteligente.png';
import imgExperience from '@/assets/ParaCadaIndustria.png';
import iconCalendario from '@/assets/iconoCalendario.png';
import iconControl from '@/assets/IconoControl.png';
import iconAutomation from '@/assets/IconoAutomatizacion.png';
import iconIndustry from '@/assets/IconoIndustria.png';

const FEATURES = [
  {
    id: 'realtime',
    title: 'Reservas en tiempo real 24/7',
    description:
      'Permite a tus clientes agendar citas o espacios desde cualquier dispositivo en segundos. La disponibilidad se sincroniza al instante, eliminando las llamadas perdidas y los cruces de horarios.',
    color: 'from-indigo-500 to-blue-600',
    image: imgRealtime,
    iconImage: iconCalendario,
  },
  {
    id: 'control',
    title: 'Control total de tu negocio',
    description:
      'Administra turnos de tu personal, gestiona pagos y controla la ocupación desde un panel unificado. Accede a métricas clave para optimizar tus horas más rentables y hacer crecer tus ingresos.',
    color: 'from-emerald-500 to-teal-600',
    image: imgControl,
    iconImage: iconControl,
  },
  {
    id: 'automation',
    title: 'Cero ausencias con avisos automáticos',
    description:
      'Envía recordatorios automáticos y confirmaciones oportunas. Reduce hasta en un 90% las inasistencias de clientes y asegura que tus espacios o profesionales siempre estén facturando.',
    color: 'from-amber-500 to-orange-600',
    image: imgAutomation,
    iconImage: iconAutomation,
  },
  {
    id: 'experience',
    title: 'Diseñado para tu industria',
    description:
      'Ya sea una barbería, centro deportivo, consultorio o salón; personaliza las políticas de cancelación, horarios especiales y métodos de pago según el ritmo único de tu sector.',
    color: 'from-rose-500 to-pink-600',
    image: imgExperience,
    iconImage: iconIndustry,
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !pinRef.current || !cardsRef.current || !visualRef.current) return;

    const isDesktop = window.innerWidth >= 1024;
    const cards = cardsRef.current.querySelectorAll('[data-feature-card]');
    const icons = visualRef.current.querySelectorAll('[data-feature-icon]');

    const ctx = gsap.context(() => {
      if (isDesktop) {
        // Desktop: experiencia pinned con scrollytelling
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
                y: -30,
                filter: 'blur(4px)',
                duration: 0.15,
                ease: 'power2.inOut',
              },
              index - 0.15
            );
          }

          tl.fromTo(
            card,
            {
              opacity: isFirst ? 1 : 0,
              y: isFirst ? 0 : 30,
              filter: isFirst ? 'blur(0px)' : 'blur(4px)',
            },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.15,
              ease: 'power2.out',
            },
            isFirst ? 0 : index - 0.15
          );

          icons.forEach((icon, iconIndex) => {
            const isTarget = iconIndex === index;
            tl.to(
              icon,
              {
                scale: isTarget ? 1 : 0.7,
                opacity: isTarget ? 1 : 0,
                y: isTarget ? 0 : 15,
                duration: 0.25,
                ease: 'power2.inOut',
              },
              isFirst ? 0 : index - 0.15
            );
          });
        });
      } else {
        // Móvil/Tablet: reveal simple por tarjeta
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

        icons.forEach((icon, idx) => {
          gsap.set(icon, { opacity: idx === 0 ? 1 : 0, scale: 1, y: 0 });
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="caracteristicas"
      className="relative bg-white lg:h-[400vh]"
    >
      {reducedMotion ? (
        <div className="relative z-10 py-12 md:py-32 px-6 max-w-7xl mx-auto">
          <FloatingIcons />
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 mb-8 md:mb-16 text-center">
            Todo lo que necesitas.
          </h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.id} className="p-5 md:p-8 rounded-3xl bg-slate-50">
                <img src={feature.iconImage} alt="" className="h-10 w-10 md:h-16 md:w-16 object-contain mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm md:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={pinRef}
          className="relative z-10 lg:h-screen w-full flex items-center justify-center px-5 md:px-6 py-8 md:py-24 lg:py-0"
        >
          <FloatingIcons />
          <div className="relative z-10 max-w-7xl w-full mx-auto grid lg:grid-cols-2 gap-6 md:gap-12 lg:gap-24 items-center">
            {/* Visual */}
            <div
              ref={visualRef}
              className="relative w-full order-first lg:order-1"
            >
              <div className="relative w-full min-h-[220px] md:min-h-[400px]">
                {FEATURES.map((feature, index) => (
                  <div
                    key={feature.id}
                    data-feature-icon
                    className={cn(
                      'absolute inset-0',
                      index === 0 ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tarjetas de contenido */}
            <div ref={cardsRef} className="relative lg:h-[300px]">
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.id}
                  data-feature-card
                  className={cn(
                    'lg:absolute lg:inset-0 flex flex-col justify-center will-change-transform',
                    index === 0 ? 'opacity-100' : 'opacity-100 lg:opacity-0',
                    'mb-6 md:mb-12 lg:mb-0 last:mb-0'
                  )}
                >
                  <img src={feature.iconImage} alt="" className="h-10 w-10 md:h-16 md:w-16 object-contain mb-3 md:mb-6" />
                  <h3 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-slate-900 tracking-tight mb-3 md:mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-base md:text-lg lg:text-xl text-slate-500 leading-relaxed max-w-lg">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
