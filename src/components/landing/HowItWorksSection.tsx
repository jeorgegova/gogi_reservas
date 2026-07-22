import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import { Building2, Users2, Scissors, Share2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    number: '01',
    icon: Building2,
    title: 'Configura tu organización',
    description: 'Registra tu negocio, sedes, horarios y políticas de cancelación en minutos.',
  },
  {
    number: '02',
    icon: Scissors,
    title: 'Agrega empleados y servicios',
    description: 'Crea tu catálogo de servicios y asigna profesionales con su disponibilidad real.',
  },
  {
    number: '03',
    icon: Share2,
    title: 'Comparte tu enlace de reservas',
    description: 'Publica tu portal en redes, tu web o WhatsApp para que los clientes agenden solos.',
  },
  {
    number: '04',
    icon: Users2,
    title: 'Empieza a recibir reservas',
    description: 'Tu agenda online se llena automáticamente mientras tú te enfocas en atender.',
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll('[data-step-card]');
    const lines = cardsRef.current.querySelectorAll('[data-step-line]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.85, y: 40 },
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

      gsap.fromTo(
        lines,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reset',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="como-funciona"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-slate-50 overflow-hidden"
    >
      <FloatingIcons />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <span className="text-xs font-bold tracking-widest text-slate-800 uppercase bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
            Flujo de trabajo simple
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Cómo funciona la plataforma de reservas en 4 pasos.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg text-slate-500 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            Sin configuraciones complejas. Crea tus servicios, define los horarios de tu equipo y comparte tu enlace de reservas automatizado con tus clientes.
          </TextReveal>
        </div>

        <div
          ref={cardsRef}
          className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-4"
        >
          {STEPS.map((step, index) => (
            <div key={index} className="relative">
              {index < STEPS.length - 1 && (
                <div
                  data-step-line
                  className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-200 to-slate-300 origin-left"
                />
              )}
              <div
                data-step-card
                className="relative p-6 md:p-8 rounded-[1.75rem] md:rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                    <step.icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-2xl md:text-3xl font-semibold text-slate-200">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                  {step.description}
                </p>
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
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20configurar%20mi%20organizaci%C3%B3n%20en%20GoGi%20Reservas."
              target="_blank"
              rel="noopener noreferrer"
            >
              Configurar mi organización
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
