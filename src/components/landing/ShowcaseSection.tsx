/**
 * ShowcaseSection
 * Demuestra el efecto de ImageReveal con placeholders visuales.
 * En móvil las imágenes se apilan verticalmente sin solapamientos excesivos.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TextReveal } from './TextReveal';
import { ImageReveal } from './ImageReveal';
import { Calendar, Bell, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

function UIPlaceholder({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full h-full rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-2xl overflow-hidden p-5 md:p-8',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !sectionRef.current) return;

      const lines = sectionRef.current.querySelectorAll('[data-showcase-line]');

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
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  return (
    <section ref={sectionRef} className="relative py-24 md:py-48 px-5 md:px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 lg:gap-24 items-center">
          {/* Text content */}
          <div className="order-2 lg:order-1">
            <TextReveal
              as="h2"
              splitBy="word"
              className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-slate-900 tracking-tight mb-6 md:mb-8"
              start="top 80%"
              end="top 55%"
              scrub={0.7}
            >
              Una interfaz que respira tranquilidad.
            </TextReveal>

            <TextReveal
              as="p"
              splitBy="word"
              className="text-base md:text-lg lg:text-xl text-slate-500 leading-relaxed mb-8 md:mb-12"
              start="top 78%"
              end="top 58%"
              scrub={0.8}
            >
              Cada interacción fue diseñada para reducir la fricción. Desde la reserva hasta la confirmación, todo fluye con naturalidad.
            </TextReveal>

            <div className="space-y-4 md:space-y-6">
              {[
                { icon: Calendar, text: 'Calendario visual claro e intuitivo' },
                { icon: Bell, text: 'Recordatorios automáticos para todos' },
                { icon: CreditCard, text: 'Pagos y validaciones integrados' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center gap-3 md:gap-4">
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
                    </div>
                    <span className="text-sm md:text-base text-slate-700 font-medium">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image reveals */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative z-10">
              <ImageReveal
                direction="up"
                start="top 85%"
                end="top 40%"
                containerClassName="rounded-[1.75rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-900/10 aspect-[4/3]"
              >
                <UIPlaceholder>
                  <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 h-10 md:h-12 rounded-xl bg-white shadow-sm flex items-center px-3 md:px-4 gap-2 md:gap-3">
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-rose-400" />
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="mt-16 md:mt-20 space-y-3 md:space-y-4">
                    <div className="h-20 md:h-24 rounded-2xl bg-white shadow-sm p-3 md:p-4 flex items-center gap-3 md:gap-4">
                      <div className="h-11 w-11 md:h-14 md:w-14 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 md:h-3 w-1/2 bg-slate-200 rounded-full mb-2" />
                        <div className="h-1.5 md:h-2 w-1/3 bg-slate-100 rounded-full" />
                      </div>
                    </div>
                    <div className="h-20 md:h-24 rounded-2xl bg-white shadow-sm p-3 md:p-4 flex items-center gap-3 md:gap-4">
                      <div className="h-11 w-11 md:h-14 md:w-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Bell className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 md:h-3 w-2/3 bg-slate-200 rounded-full mb-2" />
                        <div className="h-1.5 md:h-2 w-1/3 bg-slate-100 rounded-full" />
                      </div>
                    </div>
                  </div>
                </UIPlaceholder>
              </ImageReveal>
            </div>

            <div className="relative z-20 -mt-10 md:-mt-20 ml-8 md:ml-24">
              <ImageReveal
                direction="left"
                start="top 90%"
                end="top 45%"
                containerClassName="rounded-[1.75rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-900/10 aspect-[16/10] w-[85%]"
              >
                <UIPlaceholder className="from-white to-slate-50">
                  <div className="h-full flex flex-col justify-center items-center gap-4 md:gap-6">
                    <div className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
                      <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="h-3 md:h-4 w-32 md:w-40 bg-slate-200 rounded-full mb-2 md:mb-3 mx-auto" />
                      <div className="h-2 md:h-3 w-20 md:w-24 bg-slate-100 rounded-full mx-auto" />
                    </div>
                  </div>
                </UIPlaceholder>
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
