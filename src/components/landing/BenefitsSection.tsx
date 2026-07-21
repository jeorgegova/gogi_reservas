import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import {
  Clock,
  UserX,
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const BENEFITS = [
  {
    icon: Clock,
    title: 'Ahorra tiempo',
    description: 'Elimina la coordinación manual. Tus clientes reservan solos y tú solo recibes notificaciones.',
  },
  {
    icon: UserX,
    title: 'Reduce ausencias',
    description: 'Los recordatorios automáticos hacen que menos personas olviden sus citas, protegiendo tus ingresos.',
  },
  {
    icon: LayoutDashboard,
    title: 'Centraliza toda la operación',
    description: 'Reservas, empleados, servicios y clientes en un solo panel de gestión de citas.',
  },
  {
    icon: Users,
    title: 'Organiza empleados',
    description: 'Asigna horarios, servicios y días de descanso para cada miembro de tu equipo.',
  },
  {
    icon: Package,
    title: 'Controla servicios',
    description: 'Define duración, precio, disponibilidad y políticas de cancelación por servicio.',
  },
  {
    icon: BarChart3,
    title: 'Visualiza estadísticas',
    description: 'Conoce tus reservas, ingresos y ocupación para tomar mejores decisiones de negocio.',
  },
  {
    icon: Smartphone,
    title: 'Trabaja desde cualquier dispositivo',
    description: 'Accede a tu agenda online desde computador, tablet o celular sin instalar nada.',
  },
];

export function BenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('[data-benefit-card]');
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 95%',
          end: 'bottom 70%',
          scrub: 1,
        }
      });

      cards.forEach((card, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        
        let xOffset = 0;
        let yOffset = 0;
        
        if (col === 0) xOffset = -100;
        else if (col === 2) xOffset = 100;
        
        if (row === 0) yOffset = -60;
        else if (row === 2) yOffset = 60;

        tl.fromTo(
          card,
          {
            opacity: 0.1,
            scale: 0.8,
            x: xOffset,
            y: yOffset,
            filter: 'blur(3px)'
          },
          {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            filter: 'blur(0px)',
            ease: 'power2.out'
          },
          0
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="beneficios"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-white overflow-hidden"
    >
      <FloatingIcons />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="max-w-3xl mx-auto mb-8 md:mb-20 text-left md:text-center">
          <span className="text-[11px] md:text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-full">
            Beneficios
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6 leading-tight"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Todo lo que ganas con GoGi Reservas.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-sm md:text-lg text-slate-500 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            No es solo una agenda online. Es una plataforma de reservas que transforma la forma en que gestionas tu negocio.
          </TextReveal>
        </div>

        <div className="md:hidden -mx-5 overflow-x-auto px-5 pb-5 snap-x snap-mandatory scrollbar-hide">
          <div className="flex w-max gap-3 pr-5">
            {BENEFITS.map((benefit, index) => (
              <article
                key={benefit.title}
                className="w-[82vw] max-w-[21rem] shrink-0 snap-center rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 shadow-sm"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-800">
                    <benefit.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-400 shadow-sm">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-950 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] font-medium text-slate-400">
            Desliza para ver más beneficios
          </p>
        </div>

        <div
          ref={gridRef}
          className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {BENEFITS.map((benefit, index) => (
            <div
              key={index}
              data-benefit-card
              className="group p-6 md:p-8 rounded-[1.75rem] md:rounded-[2rem] bg-slate-50 hover:bg-slate-100 transition-colors duration-300"
            >
              <div className="h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-700 group-hover:text-indigo-600 transition-colors duration-300 mb-5">
                <benefit.icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 md:mt-16 text-center">
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 w-full sm:w-auto"
          >
            <a
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20probar%20GoGi%20Reservas%20gratis%20para%20mi%20negocio."
              target="_blank"
              rel="noopener noreferrer"
            >
              Probar gratis
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
