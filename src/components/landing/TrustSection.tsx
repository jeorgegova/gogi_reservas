import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import { ShieldCheck, Database, RefreshCw, HeadphonesIcon, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Datos protegidos',
    description: 'Toda la información de tu negocio y clientes viaja de forma segura con encriptación.',
  },
  {
    icon: Database,
    title: 'Copias de seguridad',
    description: 'Tus reservas y configuraciones se respaldan automáticamente para que no pierdas nada.',
  },
  {
    icon: RefreshCw,
    title: 'Actualizaciones constantes',
    description: 'Mejoramos la plataforma continuamente sin que tengas que instalar nada.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Soporte humano',
    description: 'Estamos disponibles para ayudarte a resolver dudas y sacar el máximo provecho.',
  },
  {
    icon: Clock,
    title: 'Disponibilidad 24/7',
    description: 'Tu agenda online está siempre activa para recibir reservas, incluso fuera de horario.',
  },
];

export function TrustSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('[data-trust-card]');
    const ctx = gsap.context(() => {
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 50, scale: 0.8, filter: 'blur(4px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card as HTMLElement,
              start: 'top 88%',
              toggleActions: 'play none none reset',
            },
          }
        );
      });

      gsap.to(cards, {
        y: -3,
        duration: 2.5,
        stagger: { each: 0.15, from: 'random' },
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
      id="confianza"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-slate-950 overflow-hidden"
    >
      <FloatingIcons />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(99,102,241,0.10),transparent_60%),radial-gradient(circle_at_80%_75%,rgba(244,63,94,0.06),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-2xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight mt-4 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Tu operación en buenas manos.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg text-slate-400 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            Sabemos que confías en nosotros la información de tu negocio. Por eso GoGi Reservas está construido para ser seguro, estable y siempre disponible.
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {TRUST_PILLARS.map((pillar, index) => (
            <div
              key={index}
              data-trust-card
              className="group p-6 md:p-8 rounded-[1.75rem] md:rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
            >
              <div className="h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center text-white group-hover:text-indigo-300 transition-colors duration-300 mb-5">
                <pillar.icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                {pillar.title}
              </h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 md:mt-16 text-center">
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
          >
            <a
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20crear%20una%20cuenta%20segura%20en%20GoGi%20Reservas."
              target="_blank"
              rel="noopener noreferrer"
            >
              Crear cuenta segura
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
