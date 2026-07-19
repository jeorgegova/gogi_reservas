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
import { ArrowDown, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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
          opacity: isMobile ? 0.5 : 0.1,
          scale: isMobile ? 0.98 : 0.92,
          filter: isMobile ? 'blur(0px)' : 'blur(8px)',
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom center',
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
        className="relative min-h-screen md:min-h-[150vh] flex flex-col items-center justify-start overflow-hidden bg-white"
        aria-label="Hero principal"
      >
        {/* Fondo superior */}
        <div className="absolute inset-0 z-0">
          <img
            src={fondoSuperior}
            alt=""
            role="presentation"
            className="w-full h-full object-cover opacity-80"
            loading="eager"
            decoding="async"
            width="1983"
            height="793"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
        </div>

      {/* Capas parallax de fondo sutiles */}
      <ParallaxLayer
        speed={0.08}
        direction="up"
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
      >
        <div className="w-[80vw] md:w-[70vw] h-[80vw] md:h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-br from-white/40 to-slate-100/40 blur-3xl opacity-40" />
      </ParallaxLayer>

      {/* Contenido principal */}
      <div
        ref={contentRef}
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-5 md:px-6 will-change-[opacity,transform] z-10"
      >
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-2 md:mb-3">
            <img
              src={logoConTexto}
              alt="GoGi Reservas - Software de reservas y agenda online"
              width="205"
              height="308"
              className={`h-32 md:h-52 w-auto object-contain ${!reducedMotion ? 'animate-float' : ''}`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <TextReveal
            as="h1"
            splitBy="word"
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-tight text-slate-900 leading-[1.08] md:leading-[1.05]"
            start="top 75%"
            end="top 45%"
            scrub={0.7}
          >
            Más reservas, Menos complicaciones.
          </TextReveal>

          <div className="mt-4 md:mt-10 max-w-xl md:max-w-3xl mx-auto px-2 md:px-0">
            <p ref={subtitleRef} className="text-sm sm:text-lg md:text-xl lg:text-2xl text-slate-500 leading-relaxed">
              La plataforma de <strong className="text-slate-700 font-semibold">software de reservas</strong> y <strong className="text-slate-700 font-semibold">agenda online</strong> que automatiza citas, reduce ausencias con recordatorios y administra tu negocio desde un solo panel.
            </p>
          </div>

          <div className="mt-6 md:mt-10 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {['Software de reservas', 'Agenda online', 'Gestión de clientes', 'Gestión de empleados', 'Servicios', 'Automatización'].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 text-[10px] md:text-xs font-medium text-slate-600 shadow-sm"
              >
                <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-500" aria-hidden="true" />
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-950 hover:shadow-xl hover:shadow-slate-900/10 border border-slate-900 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto"
            >
              <a
                href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20crear%20una%20cuenta%20gratis%20en%20GoGi%20Reservas."
                target="_blank"
                rel="noopener noreferrer"
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base border-slate-200 text-slate-700 bg-white/40 hover:bg-white/80 hover:text-slate-950 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto"
            >
              <Link to="/organizaciones">
                Ver organizaciones
              </Link>
            </Button>
          </div>

          <div className="mt-5 md:mt-7 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-[10px] md:text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              Sin tarjeta de crédito
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              Configuración en minutos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              Plan gratuito para siempre
            </span>
          </div>

        </div>

        {/* Indicador de scroll */}
        <button
          type="button"
          onClick={() => document.getElementById('problemas')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg"
          aria-label="Desplazarse a la sección de problemas que resuelve"
        >
          <span className="text-[10px] md:text-xs tracking-widest uppercase font-medium">Scroll</span>
          <ArrowDown className="w-4 h-4 md:w-5 md:h-5 animate-bounce-soft" aria-hidden="true" />
        </button>
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
