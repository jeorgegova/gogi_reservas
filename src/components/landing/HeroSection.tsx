/**
 * HeroSection
 * Sección hero cinematográfica con parallax, text reveal y fade out sincronizado al scroll.
 * El contenido se desvanece y escala mientras el usuario comienza a hacer scroll.
 * Adaptado para móvil con tipografía reducida y animaciones más contenidas.
 */
import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { ParallaxLayer } from './ParallaxLayer';
import { ArrowDown } from 'lucide-react';
import logoConTexto from '@/assets/LogoConTexto.png';
import fondoSuperior from '@/assets/FondoSuperior.png';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !contentRef.current || !sectionRef.current) return;

    const content = contentRef.current;
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        content,
        {
          opacity: 1,
          scale: 1,
        },
        {
          opacity: isMobile ? 0.3 : 0.1,
          scale: isMobile ? 0.96 : 0.92,
          filter: isMobile ? 'blur(0px)' : 'blur(8px)',
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5,
          },
        }
      );

      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: subtitleRef.current,
              start: 'top 85%',
              end: 'top 60%',
              scrub: 1,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[130vh] md:min-h-[150vh] flex flex-col items-center justify-start overflow-hidden bg-white"
    >
      {/* Fondo superior */}
      <div className="absolute inset-0 z-0">
        <img
          src={fondoSuperior}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/30" />
      </div>

      {/* Capas parallax de fondo sutiles */}
      <ParallaxLayer
        speed={0.15}
        direction="up"
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
      >
        <div className="w-[80vw] md:w-[70vw] h-[80vw] md:h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-br from-white/40 to-slate-100/40 blur-3xl opacity-40" />
      </ParallaxLayer>

      {/* Contenido principal */}
      <div
        ref={contentRef}
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-5 md:px-6 will-change-transform z-10"
      >
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-2 md:mb-3">
            <img
              src={logoConTexto}
              alt="GoGi Reservas"
              className={`h-40 md:h-52 w-auto object-contain ${!reducedMotion ? 'animate-float' : ''}`}
            />
          </div>

          <TextReveal
            as="h1"
            splitBy="word"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-tight text-slate-900 leading-[1.08] md:leading-[1.05]"
            start="top 75%"
            end="top 45%"
            scrub={0.7}
          >
            Más reservas, Menos complicaciones.
          </TextReveal>

          <div className="mt-6 md:mt-10 max-w-xl md:max-w-2xl mx-auto px-2 md:px-0">
            <p ref={subtitleRef} className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-500 leading-relaxed">
              Organiza tu agenda, automatiza tus reservas y brinda una experiencia profesional desde el primer clic.
            </p>
          </div>

        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-3 text-slate-400">
          <span className="text-[10px] md:text-xs tracking-widest uppercase font-medium">Scroll</span>
          <ArrowDown className="w-4 h-4 md:w-5 md:h-5 animate-bounce-soft" />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
