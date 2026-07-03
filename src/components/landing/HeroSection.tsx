/**
 * HeroSection
 * Sección hero cinematográfica con parallax, text reveal y fade out sincronizado al scroll.
 * El contenido se desvanece y escala mientras el usuario comienza a hacer scroll.
 * Adaptado para móvil con tipografía reducida y animaciones más contenidas.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TextReveal } from './TextReveal';
import { ParallaxLayer } from './ParallaxLayer';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowRight } from 'lucide-react';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !contentRef.current || !sectionRef.current) return;

      // Animación adaptada: en móvil el fade es más sutil para no perder legibilidad
      const mm = gsap.matchMedia({
        '(min-width: 768px)': function () {
          return {
            animation: ScrollTrigger.create({
              trigger: sectionRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.5,
              onUpdate: (self) => {
                if (!contentRef.current) return;
                const progress = self.progress;
                contentRef.current.style.opacity = String(1 - progress * 0.9);
                contentRef.current.style.transform = `scale(${1 - progress * 0.08})`;
                contentRef.current.style.filter = `blur(${progress * 8}px)`;
              },
            }),
          };
        },
        '(max-width: 767px)': function () {
          return {
            animation: ScrollTrigger.create({
              trigger: sectionRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.5,
              onUpdate: (self) => {
                if (!contentRef.current) return;
                const progress = self.progress;
                contentRef.current.style.opacity = String(1 - progress * 0.7);
                contentRef.current.style.transform = `scale(${1 - progress * 0.04})`;
                // En móvil evitamos blur para mantener la legibilidad del texto
                contentRef.current.style.filter = 'none';
              },
            }),
          };
        },
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[130vh] md:min-h-[150vh] flex flex-col items-center justify-start overflow-hidden bg-white"
    >
      {/* Capas parallax de fondo */}
      <ParallaxLayer
        speed={0.15}
        direction="up"
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[80vw] md:w-[70vw] h-[80vw] md:h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-br from-slate-100 to-slate-50 blur-3xl opacity-60" />
      </ParallaxLayer>

      <ParallaxLayer
        speed={0.25}
        direction="down"
        className="absolute top-[25%] md:top-[20%] right-[-15%] pointer-events-none"
      >
        <div className="w-[50vw] md:w-[40vw] h-[50vw] md:h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-bl from-indigo-100/60 to-purple-100/30 blur-3xl" />
      </ParallaxLayer>

      <ParallaxLayer
        speed={0.35}
        direction="up"
        className="absolute bottom-[10%] left-[-5%] pointer-events-none"
      >
        <div className="w-[40vw] md:w-[35vw] h-[40vw] md:h-[35vw] max-w-[450px] max-h-[450px] rounded-full bg-gradient-to-tr from-rose-100/40 to-amber-100/30 blur-3xl" />
      </ParallaxLayer>

      {/* Contenido principal */}
      <div
        ref={contentRef}
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-5 md:px-6 will-change-transform"
      >
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-slate-400 mb-6 md:mb-8">
            GoGi Reservas
          </p>

          <TextReveal
            as="h1"
            splitBy="word"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-tight text-slate-900 leading-[1.08] md:leading-[1.05]"
            start="top 75%"
            end="top 45%"
            scrub={0.7}
          >
            Reservas que fluyen contigo.
          </TextReveal>

          <div className="mt-6 md:mt-10 max-w-xl md:max-w-2xl mx-auto px-2 md:px-0">
            <TextReveal
              as="p"
              splitBy="word"
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-500 leading-relaxed"
              start="top 70%"
              end="top 40%"
              scrub={0.8}
            >
              La plataforma donde cada espacio, servicio y momento se gestiona con la elegancia de una experiencia premium.
            </TextReveal>
          </div>

          <div className="mt-8 md:mt-12">
            <Button
              asChild
              size="lg"
              className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
            >
              <a href="#organizaciones">
                Ver organizaciones
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-3 text-slate-400">
          <span className="text-[10px] md:text-xs tracking-widest uppercase font-medium">Scroll</span>
          <ArrowDown className="w-4 h-4 md:w-5 md:h-5 animate-bounce-soft" />
        </div>
      </div>
    </section>
  );
}
