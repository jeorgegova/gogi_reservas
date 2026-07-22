/**
 * GallerySection
 * Galería de tipos de negocio con scroll horizontal sincronizado.
 * Combina scroll horizontal (desktop) / scroll horizontal nativo (móvil)
 * con animaciones reveal escalonadas y efectos hover en cada tarjeta.
 */
import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { cn } from '@/lib/utils';
import conjuntosImg from '@/assets/TiposDeNegocios/ConjuntoRecidencial.png';
import barberiaImg from '@/assets/TiposDeNegocios/Barberia.png';
import salonImg from '@/assets/TiposDeNegocios/SalonDeBelleza.png';
import salaEnsayoImg from '@/assets/TiposDeNegocios/SalaDeEnsayo.png';
import coworkingImg from '@/assets/TiposDeNegocios/Cooworkin.png';
import otrosImg from '@/assets/TiposDeNegocios/Otros.png';

interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  gradient?: string;
  accent?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'residential',
    title: 'Conjuntos residenciales',
    subtitle: 'Software para conjuntos residenciales y áreas comunes',
    image: conjuntosImg,
  },
  {
    id: 'barbershop',
    title: 'Barberías',
    subtitle: 'Software para barberías con citas precisas',
    image: barberiaImg,
  },
  {
    id: 'beauty',
    title: 'Salones de belleza',
    subtitle: 'Software para salones de belleza y spas',
    image: salonImg,
  },
  {
    id: 'workshop',
    title: 'Salas de ensayo',
    subtitle: 'Turnos sin espera para estudios creativos',
    image: salaEnsayoImg,
  },
  {
    id: 'office',
    title: 'Oficinas y coworking',
    subtitle: 'Software para coworking y espacios compartidos',
    image: coworkingImg,
  },
  {
    id: 'other',
    title: 'Consultorios, gimnasios y más',
    subtitle: 'Sistema de reservas adaptable a cualquier industria',
    image: otrosImg,
  },
];

export function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !mobileScrollRef.current || window.innerWidth >= 768) return;

    const scroller = mobileScrollRef.current;
    let resumeTimeoutId: number;
    let paused = false;

    const getStep = () => {
      const firstCard = scroller.querySelector('[data-gallery-card]') as HTMLElement | null;
      return firstCard ? firstCard.offsetWidth + 16 : Math.round(window.innerWidth * 0.82);
    };

    const scrollNext = () => {
      if (paused) return;

      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const nextLeft = scroller.scrollLeft + getStep();

      scroller.scrollTo({
        left: nextLeft >= maxScroll - 8 ? 0 : nextLeft,
        behavior: 'smooth',
      });
    };

    const pauseThenResume = () => {
      paused = true;
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = window.setTimeout(() => {
        paused = false;
      }, 3500);
    };

    const intervalId = window.setInterval(scrollNext, 2800);
    scroller.addEventListener('touchstart', pauseThenResume, { passive: true });
    scroller.addEventListener('pointerdown', pauseThenResume, { passive: true });

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(resumeTimeoutId);
      scroller.removeEventListener('touchstart', pauseThenResume);
      scroller.removeEventListener('pointerdown', pauseThenResume);
    };
  }, [reducedMotion]);

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !trackRef.current) return;

    const track = trackRef.current;
    const getScrollDistance = () => Math.max(1, track.scrollWidth - window.innerWidth);
    const cards = track.querySelectorAll('[data-gallery-card]');
    const isDesktop = window.innerWidth >= 768;

    const ctx = gsap.context(() => {
      if (isDesktop) {
        // Desktop: timeline que combina scroll horizontal y reveal de tarjetas
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: () => `+=${getScrollDistance()}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Movimiento horizontal del track durante todo el recorrido
        tl.to(track, {
          x: () => -getScrollDistance(),
          ease: 'none',
          duration: 1,
        }, 0);

        // Reveal escalonado de tarjetas dentro del mismo timeline
        cards.forEach((card, index) => {
          const start = index * 0.12;
          const end = start + 0.2;

          tl.fromTo(
            card,
            {
              opacity: 0.4,
              y: 40,
              scale: 0.92,
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.2,
              ease: 'power2.out',
            },
            start
          );

          // Suave atenuación cuando la tarjeta se aleja
          if (index < cards.length - 1) {
            tl.to(
              card,
              {
                opacity: 0.7,
                scale: 0.96,
                duration: 0.1,
                ease: 'power2.in',
              },
              end
            );
          }
        });
      } else {
        // Móvil: reveal simple
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
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const renderCard = (item: GalleryItem, index: number, isGrid = false) => {
    const hasImage = 'image' in item;
    const Icon = item.icon;
    return (
      <div
        key={item.id}
        data-gallery-card={isGrid ? undefined : true}
        className={cn(
          'relative rounded-[1.75rem] md:rounded-[2.5rem] overflow-hidden border border-white/80 bg-white shadow-2xl shadow-slate-900/10',
          !hasImage && 'bg-gradient-to-br backdrop-blur-sm',
          !hasImage && item.gradient,
          'group will-change-transform',
          'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isGrid
            ? 'aspect-[4/3] p-6 md:p-8'
            : cn(
              'flex-shrink-0 w-[78vw] sm:w-[60vw] md:w-[45vw] lg:w-[35vw] aspect-[4/4.2] snap-center hover:scale-[1.03] hover:-translate-y-2',
              index === 0 && 'ml-10 sm:ml-20 md:ml-32 lg:ml-48'
            )
        )}
      >
        {hasImage && item.image ? (
          <>
            <img
              src={item.image}
              alt={`${item.title} - ${item.subtitle}`}
              width="1086"
              height="1448"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-950/20 to-transparent transition-opacity duration-700 group-hover:opacity-90" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent transition-colors duration-700" />
        )}

        <div className="relative h-full flex flex-col justify-between p-6 md:p-10 z-10">
          <div className="flex justify-between items-start">
            {Icon && (
              <div
                className={cn(
                  'h-11 w-11 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center',
                  item.accent || 'bg-white/10 text-white border border-white/20',
                  'backdrop-blur-md shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3'
                )}
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs md:text-sm text-white/70 font-medium mb-1 md:mb-2 tracking-wide uppercase">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-1 md:mb-2 tracking-tight drop-shadow-sm">
              {item.title}
            </h3>
            <p className="text-white/85 text-base md:text-lg leading-snug">{item.subtitle}</p>
          </div>
        </div>
      </div>
    );
  };

  if (reducedMotion) {
    return (
      <section ref={sectionRef} id="industrias" className="relative py-16 md:py-32 px-6 bg-[linear-gradient(180deg,#fff_0%,#f8fafc_45%,#eef2ff_100%)]">
        <div className="max-w-7xl mx-auto">
          <p className="mb-3 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Industrias
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-950 tracking-tight mb-4">
            Software de reservas diseñado para cada industria.
          </h2>
          <p className="mb-12 md:mb-16 max-w-2xl text-base md:text-lg text-slate-500">
            Muestra tu negocio con una experiencia visual, clara y fácil de reservar desde cualquier celular.
          </p>
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
      id="industrias"
      className="relative md:h-screen md:overflow-hidden bg-[linear-gradient(180deg,#fff_0%,#f8fafc_42%,#eef2ff_100%)] py-12 md:py-0"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(239,68,68,0.10),transparent_35%),radial-gradient(circle_at_78%_74%,rgba(99,102,241,0.14),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="md:absolute md:top-20 md:left-6 lg:left-12 z-10 max-w-none px-6 md:px-0 mb-6 md:mb-0">

        <TextReveal
          as="h2"
          splitBy="word"
          className="max-w-2xl text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-950 tracking-tight"
          start="top 80%"
          end="top 60%"
          scrub={0.6}
        >
          Software de reservas para cada industria.
        </TextReveal>
        <p className="mt-4 max-w-xl text-sm md:text-base text-slate-500">
          Descubre cómo GoGi Reservas se adapta a tu negocio. Administra horarios, recursos, clientes y reservas desde una única plataforma.
        </p>
      </div>

      {/* Móvil: scroll horizontal nativo con snap */}
      <div ref={mobileScrollRef} className="md:hidden overflow-x-auto pb-4 px-6 snap-x snap-mandatory scrollbar-hide -mx-6">
        <div className="flex gap-4 w-max pr-6">
          {GALLERY_ITEMS.map((item, index) => renderCard(item, index))}
        </div>
      </div>
      <p className="md:hidden px-6 text-center text-[11px] font-medium text-slate-400">
        Se desplaza automáticamente. Toca para pausar y explorar.
      </p>

      {/* Desktop: track controlado por GSAP */}
      <div
        ref={trackRef}
        className="hidden md:flex absolute top-[56%] -translate-y-1/2 left-0 lg:left-30 items-center gap-8 pl-6 lg:pl-12 pr-[50vw] will-change-transform"
      >
        {GALLERY_ITEMS.map((item, index) => renderCard(item, index))}
      </div>
    </section>
  );
}
