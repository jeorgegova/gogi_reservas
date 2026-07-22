import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import { Quote, Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: 'Antes perdía horas coordinando citas por mensaje. Ahora mis clientes reservan solos y yo solo llego a atender.',
    author: 'Propietario de barbería',
    location: 'Bogotá, Colombia',
    rating: 5,
  },
  {
    quote: 'Los recordatorios automáticos redujeron drásticamente las inasistencias. Mis estilistas están mucho más organizadas.',
    author: 'Directora de salón de belleza',
    location: 'Medellín, Colombia',
    rating: 5,
  },
  {
    quote: 'Poder ver la disponibilidad de cada consultorio en tiempo real cambió por completo la forma de organizar nuestra clínica.',
    author: 'Administrador de consultorio',
    location: 'Cali, Colombia',
    rating: 5,
  },
];

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('[data-testimonial-card]');
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const fromX = i === 0 ? -80 : i === 2 ? 80 : 0;
        gsap.fromTo(
          card,
          { opacity: 0, x: fromX, scale: 0.85, rotationY: fromX * 0.1 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            rotationY: 0,
            duration: 0.9,
            ease: 'back.out(1.6)',
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
        stagger: { each: 0.15, from: 'center' },
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
      id="testimonios"
      className="relative py-16 md:py-32 px-5 md:px-6 bg-slate-50 overflow-hidden"
    >
      <FloatingIcons />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <span className="text-xs font-bold tracking-widest text-slate-800 uppercase bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
            Testimonios
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-2xl md:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-tight mt-4 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Lo que dicen quienes ya usan GoGi Reservas.
          </TextReveal>
          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg text-slate-500 leading-relaxed"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            Negocios de diferentes sectores ya organizan sus reservas con nuestra plataforma. Estas son algunas de sus experiencias.
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          {TESTIMONIALS.map((testimonial, index) => (
            <div
              key={index}
              data-testimonial-card
              className="relative p-6 md:p-8 rounded-[1.75rem] md:rounded-[2rem] bg-white border border-slate-100 shadow-sm"
            >
              <Quote className="absolute top-6 right-6 h-6 w-6 md:h-8 md:w-8 text-slate-100" aria-hidden="true" />
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
              </div>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed mb-6">
                “{testimonial.quote}”
              </p>
              <div>
                <p className="text-sm font-semibold text-slate-900">{testimonial.author}</p>
                <p className="text-xs text-slate-500">{testimonial.location}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 md:mt-14 text-center text-xs md:text-sm text-slate-400">
          *Estos testimonios son representativos y se actualizarán con opiniones reales de usuarios.
        </p>
      </div>
    </section>
  );
}
