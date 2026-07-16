import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import {
  MessageCircle,
  Table2,
  CalendarX2,
  Users,
  MessageSquareQuote,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROBLEMS = [
  {
    icon: CalendarX2,
    question: '¿Pierdes clientes porque olvidan sus citas?',
    solution: 'Reduce las ausencias hasta un 90% con recordatorios automáticos por correo y WhatsApp.',
  },
  {
    icon: MessageCircle,
    question: '¿Organizas reservas por WhatsApp?',
    solution: 'Centraliza todas las reservas en una agenda online disponible las 24 horas.',
  },
  {
    icon: Table2,
    question: '¿Usas Excel para controlar horarios?',
    solution: 'Olvídate de las hojas de cálculo. Tu disponibilidad se actualiza en tiempo real.',
  },
  {
    icon: Clock,
    question: '¿Tienes sobreventas de horarios?',
    solution: 'Evita cruces de agenda con disponibilidad automática por empleado y servicio.',
  },
  {
    icon: Users,
    question: '¿Tus empleados manejan agendas diferentes?',
    solution: 'Unifica la operación de tu equipo en un solo panel de gestión de citas.',
  },
  {
    icon: MessageSquareQuote,
    question: '¿Pierdes tiempo respondiendo siempre lo mismo?',
    solution: 'Deja que tus clientes agenden solos con tu enlace de reservas personalizado.',
  },
];

export function ProblemsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('[data-problem-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          scale: 0.85,
          x: (i) => (i % 2 === 0 ? -60 : 60),
          rotate: (i) => (i % 2 === 0 ? -2 : 2)
        },
        {
          opacity: 1,
          scale: 1,
          x: 0,
          rotate: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'back.out(1.3)',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 85%',
            end: 'bottom 15%',
            toggleActions: 'play reverse restart reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="problemas"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-white overflow-hidden"
    >
      <FloatingIcons />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-full">
            ¿Te resulta familiar?
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-2xl md:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Deja que GoGi Reservas organice tu operación.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg text-slate-500 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            Los negocios que trabajan con reservas pierden tiempo y dinero todos los días. Nuestro sistema de reservas está diseñado para resolver exactamente esos puntos de fricción.
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {PROBLEMS.map((problem, index) => (
            <div
              key={index}
              data-problem-card
              className="group relative p-6 md:p-8 rounded-[1.75rem] md:rounded-[2rem] bg-slate-50 hover:bg-slate-100 transition-colors duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-700 group-hover:text-indigo-600 transition-colors duration-300">
                  <problem.icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2 leading-snug">
                    {problem.question}
                  </h3>
                  <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                    {problem.solution}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 md:mt-16 text-center">
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
          >
            <a
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20resolver%20los%20problemas%20de%20gesti%C3%B3n%20de%20mi%20negocio%20con%20GoGi%20Reservas."
              target="_blank"
              rel="noopener noreferrer"
            >
              Resolverlo ahora
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
