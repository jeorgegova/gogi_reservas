/**
 * GallerySection
 * Galería de tipos de negocio con scroll horizontal sincronizado.
 * Combina scroll horizontal (desktop) / scroll horizontal nativo (móvil)
 * con animaciones reveal escalonadas y efectos hover en cada tarjeta.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TextReveal } from './TextReveal';
import { Building2, Scissors, Sparkles, Wrench, Laptop, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const GALLERY_ITEMS = [
  {
    id: 'residential',
    title: 'Conjuntos residenciales',
    subtitle: 'Áreas comunes organizadas',
    icon: Building2,
    gradient: 'from-blue-500/20 to-indigo-500/20',
    accent: 'bg-blue-500',
  },
  {
    id: 'barbershop',
    title: 'Barberías',
    subtitle: 'Citas con precisión',
    icon: Scissors,
    gradient: 'from-amber-500/20 to-orange-500/20',
    accent: 'bg-amber-500',
  },
  {
    id: 'beauty',
    title: 'Salones de belleza',
    subtitle: 'Experiencias de bienestar',
    icon: Sparkles,
    gradient: 'from-pink-500/20 to-rose-500/20',
    accent: 'bg-pink-500',
  },
  {
    id: 'workshop',
    title: 'Talleres',
    subtitle: 'Turnos sin espera',
    icon: Wrench,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    accent: 'bg-emerald-500',
  },
  {
    id: 'office',
    title: 'Oficinas y coworking',
    subtitle: 'Espacios compartidos',
    icon: Laptop,
    gradient: 'from-violet-500/20 to-purple-500/20',
    accent: 'bg-violet-500',
  },
  {
    id: 'other',
    title: 'Cualquier negocio',
    subtitle: 'Adaptable a tu ritmo',
    icon: Briefcase,
    gradient: 'from-slate-500/20 to-gray-500/20',
    accent: 'bg-slate-500',
  },
];

export function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !sectionRef.current || !trackRef.current) return;

      const track = trackRef.current;
      const totalWidth = track.scrollWidth - window.innerWidth;
      const cards = track.querySelectorAll('[data-gallery-card]');

      const mm = gsap.matchMedia({
        // Desktop: scroll vertical convertido en horizontal con reveal de tarjetas
        '(min-width: 768px)': function () {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top top',
              end: () => `+=${totalWidth}`,
              pin: true,
              scrub: 0.8,
              anticipatePin: 1,
            },
          });

          // Movimiento horizontal del track
          tl.to(track, {
            x: -totalWidth,
            ease: 'none',
            duration: 1,
          }, 0);

          // Reveal escalonado de cada tarjeta durante el recorrido
          cards.forEach((card, index) => {
            const startProgress = index / (cards.length + 1);
            const endProgress = startProgress + 0.15;

            tl.fromTo(
              card,
              {
                opacity: 0.5,
                y: 40,
                scale: 0.92,
                filter: 'blur(6px)',
              },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                duration: 0.15,
                ease: 'power2.out',
              },
              startProgress
            );

            // Ligera atenuación cuando la tarjeta se aleja
            tl.to(
              card,
              {
                opacity: 0.6,
                scale: 0.96,
                duration: 0.1,
                ease: 'power2.in',
              },
              endProgress
            );
          });

          return () => {
            ScrollTrigger.getAll()
              .filter((st) => st.trigger === sectionRef.current)
              .forEach((st) => st.kill());
          };
        },
        // Móvil: scroll horizontal nativo con reveal simple
        '(max-width: 767px)': function () {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 30, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              stagger: 0.08,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 80%',
                end: 'top 50%',
                scrub: 0.5,
              },
            }
          );
        },
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  const renderCard = (item: typeof GALLERY_ITEMS[0], index: number, isGrid = false) => {
    const Icon = item.icon;
    return (
      <div
        key={item.id}
        data-gallery-card={isGrid ? undefined : true}
        className={cn(
          'relative rounded-[1.75rem] md:rounded-[2.5rem] overflow-hidden',
          'bg-gradient-to-br border border-white/10 backdrop-blur-sm',
          item.gradient,
          'group will-change-transform',
          'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isGrid
            ? 'aspect-[4/3] p-6 md:p-8'
            : 'flex-shrink-0 w-[78vw] sm:w-[60vw] md:w-[45vw] lg:w-[35vw] aspect-[4/5] snap-center hover:scale-[1.03] hover:-translate-y-2'
        )}
      >
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-700" />

        <div className="relative h-full flex flex-col justify-between p-6 md:p-10">
          <div
            className={cn(
              'h-11 w-11 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center',
              item.accent,
              'shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3'
            )}
          >
            <Icon className="h-6 w-6 md:h-7 md:w-7 text-white" strokeWidth={1.5} />
          </div>

          <div>
            <p className="text-xs md:text-sm text-white/60 font-medium mb-1 md:mb-2 tracking-wide uppercase">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-1 md:mb-2">
              {item.title}
            </h3>
            <p className="text-white/70 text-base md:text-lg">{item.subtitle}</p>
          </div>
        </div>
      </div>
    );
  };

  if (reducedMotion) {
    return (
      <section ref={sectionRef} className="relative py-24 md:py-32 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-12 md:mb-16">
            Diseñado para cada industria.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GALLERY_ITEMS.map((item, index) => renderCard(item, index, true))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative md:h-screen md:overflow-hidden bg-slate-950 py-24 md:py-0"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />

      <div className="md:absolute md:top-16 md:left-6 lg:left-12 z-10 max-w-xl px-6 md:px-0 mb-8 md:mb-0">
        <TextReveal
          as="h2"
          splitBy="word"
          className="text-2xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight"
          start="top 80%"
          end="top 60%"
          scrub={0.6}
        >
          Diseñado para cada industria.
        </TextReveal>
      </div>

      {/* Móvil: scroll horizontal nativo con snap */}
      <div className="md:hidden overflow-x-auto pb-6 px-6 snap-x snap-mandatory scrollbar-hide -mx-6">
        <div className="flex gap-5 w-max pr-6">
          {GALLERY_ITEMS.map((item, index) => renderCard(item, index))}
        </div>
      </div>

      {/* Desktop: track controlado por GSAP */}
      <div
        ref={trackRef}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 items-center gap-8 pl-6 lg:pl-12 pr-[50vw] will-change-transform"
      >
        {GALLERY_ITEMS.map((item, index) => renderCard(item, index))}
      </div>
    </section>
  );
}
