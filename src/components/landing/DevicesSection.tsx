import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import { Monitor, Tablet, Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEVICES = [
  {
    icon: Monitor,
    title: 'Computador',
    description: 'Gestiona tu negocio desde una pantalla amplia con todo el detalle a la vista.',
  },
  {
    icon: Tablet,
    title: 'Tablet',
    description: 'Lleva tu agenda online a la recepción o a cada puesto de trabajo.',
  },
  {
    icon: Smartphone,
    title: 'Celular',
    description: 'Consulta reservas, recibe notificaciones y administra tu operación desde el bolsillo.',
  },
];

export function DevicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll('[data-device-card]');
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const dirs = [-100, 0, 100];
        gsap.fromTo(
          card,
          { opacity: 0, x: dirs[i], scale: 0.7, rotate: dirs[i] * 0.05 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            rotate: 0,
            duration: 1,
            ease: 'elastic.out(1, 0.6)',
            scrollTrigger: {
              trigger: card as HTMLElement,
              start: 'top 88%',
              toggleActions: 'play none none reset',
            },
          }
        );
      });

      gsap.to(cards, {
        y: -4,
        duration: 2.2,
        stagger: 0.15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="dispositivos"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-white overflow-hidden"
    >
      <FloatingIcons />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <span className="text-xs font-bold tracking-widest text-slate-800 uppercase bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
            Acceso 24/7 en la nube
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Gestiona tus reservas desde cualquier celular o computador.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg text-slate-500 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            Accede a tu agenda online en tiempo real desde tu móvil, tablet o PC. Sin descargas ni instalaciones requeridas para ti o tus clientes.
          </TextReveal>
        </div>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          {DEVICES.map((device, index) => (
            <div
              key={index}
              data-device-card
              className="group p-6 md:p-8 rounded-[1.75rem] md:rounded-[2rem] bg-slate-50 hover:bg-slate-100 transition-colors duration-300 text-center"
            >
              <div className="mx-auto h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-700 group-hover:text-indigo-600 transition-colors duration-300 mb-5">
                <device.icon className="h-6 w-6 md:h-7 md:w-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                {device.title}
              </h3>
              <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                {device.description}
              </p>
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
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20probar%20GoGi%20Reservas%20desde%20mi%20celular."
              target="_blank"
              rel="noopener noreferrer"
            >
              Probar desde mi celular
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
