/**
 * ShowcaseSection
 * Demuestra el efecto de ImageReveal con placeholders visuales.
 * En móvil las imágenes se apilan verticalmente sin solapamientos excesivos.
 */
import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { ImageReveal } from './ImageReveal';
import interfazImg from '@/assets/Interfaz.png';
import loginImg from '@/assets/login.png';
import calendarioGris from '@/assets/CalendarioGris.png';
import notificaciones from '@/assets/Notificaciones.png';
import oprimizaciones from '@/assets/Oprimizaciones.png';

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current) return;

    const lines = sectionRef.current.querySelectorAll('[data-showcase-line]');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        lines,
        { scaleX: 0 },
        {
          scaleX: 1,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            end: 'top 30%',
            scrub: 0.6,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} id="funcionalidades" className="relative py-12 md:py-48 px-5 md:px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-16 lg:gap-24 items-center">
          {/* Text content */}
          <div className="space-y-6 md:space-y-8">
            <TextReveal
              as="h2"
              splitBy="word"
              className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-slate-900 tracking-tight mb-6 md:mb-8"
              start="top 80%"
              end="top 55%"
              scrub={0.7}
            >
              Una interfaz de agenda online pensada para ti.
            </TextReveal>

            <TextReveal
              as="p"
              splitBy="word"
              className="text-base md:text-lg lg:text-xl text-slate-500 leading-relaxed mb-8 md:mb-12"
              start="top 78%"
              end="top 58%"
              scrub={0.8}
            >
              Cada interacción de nuestro sistema de reservas fue diseñada para reducir la fricción. Desde la reserva en línea hasta la confirmación, tu agenda online fluye con naturalidad.
            </TextReveal>

          <div className="space-y-4 md:space-y-8">
              {[
                { img: calendarioGris, text: 'Calendario visual claro e intuitivo' },
                { img: notificaciones, text: 'Recordatorios automáticos para todos' },
                { img: oprimizaciones, text: 'Reportes de reservas realizadas' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4 md:gap-5">
                  <img
                  src={item.img}
                  alt={item.text}
                  width="40"
                  height="40"
                  className="h-8 w-8 md:h-10 md:w-10 object-contain shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                  <span className="text-sm md:text-base text-slate-700 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image reveals */}
          <div className="order-first lg:order-2 relative">
            <div className="relative z-10">
              <ImageReveal
                direction="up"
                start="top 85%"
                end="top 40%"
                containerClassName="rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-900/10"
              >
                <img
                  src={interfazImg}
                  alt="Panel de agenda online y calendario de reservas de GoGi Reservas"
                  width="1672"
                  height="941"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </ImageReveal>
            </div>

            <div className="relative z-20 -mt-8 md:-mt-20 ml-6 md:ml-24">
              <ImageReveal
                direction="left"
                start="top 90%"
                end="top 45%"
                containerClassName="rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-900/10 w-[85%]"
              >
                <img
                  src={loginImg}
                  alt="Portal de inicio de sesión de GoGi Reservas para gestión de reservas"
                  width="1104"
                  height="1016"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </ImageReveal>
            </div>

            {/* Decorative line */}
            <div
              data-showcase-line
              className="absolute top-1/2 -right-12 h-px w-32 bg-gradient-to-r from-indigo-500/50 to-transparent origin-left hidden lg:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
