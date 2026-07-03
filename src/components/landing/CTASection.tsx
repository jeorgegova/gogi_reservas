/**
 * CTASection
 * Sección final con gradiente, tipografía grande y llamado a la acción.
 * Las animaciones están sincronizadas con el scroll para una transición suave.
 * Adaptado para móvil con tipografía reducida y botones apilados.
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TextReveal } from './TextReveal';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !contentRef.current || !sectionRef.current) return;

      gsap.fromTo(
        contentRef.current,
        { opacity: 0.4, scale: 0.95, y: 60 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 30%',
            scrub: 0.6,
          },
        }
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  return (
    <section ref={sectionRef} className="relative py-24 md:py-48 px-5 md:px-6 bg-slate-950 overflow-hidden">
      {/* Fondos radiales animados */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full bg-indigo-500/10 blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 right-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-rose-500/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div
        ref={contentRef}
        className="relative z-10 max-w-5xl mx-auto text-center will-change-transform"
      >
        <TextReveal
          as="h2"
          splitBy="word"
          className="text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-semibold text-white tracking-tight mb-6 md:mb-8"
          start="top 80%"
          end="top 55%"
          scrub={0.7}
        >
          Empieza a gestionar tus reservas hoy.
        </TextReveal>

        <TextReveal
          as="p"
          splitBy="word"
          className="text-base md:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-8 md:mb-12"
          start="top 78%"
          end="top 58%"
          scrub={0.8}
        >
          Únete a las organizaciones que ya confían en GoGi Reservas para ofrecer una experiencia premium.
        </TextReveal>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 w-full sm:w-auto"
          >
            <a href="#organizaciones">
              Explorar organizaciones
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base border-white/20 text-white bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </div>

      <footer className="relative z-10 mt-20 md:mt-32 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 text-slate-500 text-xs md:text-sm max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <span className="font-semibold text-white">GoGi Reservas</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Disponible 24/7</span>
        </div>
        <p className="text-center md:text-right">© {new Date().getFullYear()} GoGi Reservas. Todos los derechos reservados.</p>
      </footer>
    </section>
  );
}
