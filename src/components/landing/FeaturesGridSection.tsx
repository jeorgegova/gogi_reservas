import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import {
  CalendarDays,
  Bell,
  Users,
  Gift,
  UserCog,
  BarChart2,
  LayoutTemplate,
  Briefcase,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Agenda inteligente',
    description: 'Visualiza la disponibilidad de tu equipo en tiempo real y gestiona citas sin esfuerzo.',
  },
  {
    icon: Bell,
    title: 'Recordatorios automáticos',
    description: 'Envía confirmaciones y recordatorios por correo y WhatsApp para reducir inasistencias.',
  },
  {
    icon: Users,
    title: 'Gestión de clientes',
    description: 'Mantén el historial de reservas, contactos y preferencias de tus clientes organizado.',
  },
  {
    icon: Gift,
    title: 'Programa de fidelización',
    description: 'Motiva la recurrencia con puntos y recompensas por cada reserva completada.',
  },
  {
    icon: UserCog,
    title: 'Administración de empleados',
    description: 'Controla horarios, servicios asignados y disponibilidad de cada profesional.',
  },
  {
    icon: BarChart2,
    title: 'Estadísticas claras',
    description: 'Consulta reportes de ocupación, ingresos y rendimiento para tomar mejores decisiones.',
  },
  {
    icon: LayoutTemplate,
    title: 'Panel administrativo',
    description: 'Una interfaz simple y potente desde la que gestionas toda tu operación.',
  },
  {
    icon: Briefcase,
    title: 'Control de servicios',
    description: 'Configura precios, duración, descripción y disponibilidad de cada servicio.',
  },
  {
    icon: Clock,
    title: 'Disponibilidad en tiempo real',
    description: 'Evita dobles reservas con una agenda online que se actualiza al instante.',
  },
];

export function FeaturesGridSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('[data-feature-grid-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 30,
          scale: 0.96,
          filter: 'blur(4px)',
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          stagger: 0.06,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="caracteristicas-grid"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-white overflow-hidden"
    >
      <FloatingIcons />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/40 shadow-sm">
            Características
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-2xl md:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Herramientas pensadas para hacer crecer tu negocio.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg text-slate-500 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
             Cada función de GoGi Reservas está diseñada para ahorrarte tiempo, reducir fricciones y mejorar la experiencia de tus clientes.
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              data-feature-grid-card
              className="group p-6 md:p-8 rounded-[2rem] bg-slate-50/50 border border-slate-200/50 shadow-sm hover:bg-white hover:border-slate-300/80 hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-700 group-hover:text-white group-hover:bg-slate-900 transition-all duration-300 mb-5">
                <feature.icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 md:mt-16 text-center">
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-950 hover:shadow-xl hover:shadow-slate-900/10 border border-slate-900 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <a
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20activar%20todas%20las%20funciones%20de%20GoGi%20Reservas."
              target="_blank"
              rel="noopener noreferrer"
            >
              Activar todas las funciones
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
