import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { FloatingIcons } from './FloatingIcons';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    question: '¿Necesito instalar algo para usar GoGi Reservas?',
    answer: 'No. GoGi Reservas es una plataforma web, accedes desde tu navegador en computador, tablet o celular. No requiere instalación ni actualizaciones manuales.',
  },
  {
    question: '¿Funciona desde el celular?',
    answer: 'Sí. Tu agenda online y panel de administración están optimizados para funcionar perfectamente en dispositivos móviles. Puedes consultar reservas, recibir notificaciones y gestionar tu negocio desde cualquier lugar.',
  },
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer: 'Sí. No hay contratos de permanencia. Puedes cambiar de plan o cancelar tu suscripción en cualquier momento sin penalizaciones.',
  },
  {
    question: '¿Necesito conocimientos técnicos?',
    answer: 'No. La plataforma está diseñada para ser intuitiva. Configuras tu organización en minutos siguiendo pasos simples y cuentas con soporte si necesitas ayuda.',
  },
  {
    question: '¿Puedo comenzar gratis?',
    answer: 'Sí. El Plan Gratuito te permite probar la plataforma sin tarjeta de crédito ni compromiso. Es ideal para conocer el sistema antes de contratar un plan superior.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer: 'Sí. Tu información y la de tus clientes se almacenan de forma segura con copias de seguridad automáticas y conexiones encriptadas.',
  },
  {
    question: '¿Para qué tipos de negocio sirve GoGi Reservas?',
    answer: 'Sirve para cualquier negocio que funcione con reservas o citas: barberías, salones de belleza, consultorios, centros deportivos, gimnasios, coworkings, conjuntos residenciales, academias y muchos más.',
  },
  {
    question: '¿Cómo recibo las reservas de mis clientes?',
    answer: 'Compartes tu enlace de reservas personalizado. Los clientes eligen servicio, profesional y horario disponible. Tú recibes la confirmación en tu panel y por correo o notificaciones.',
  },
];

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current || !listRef.current) return;

    const items = listRef.current.querySelectorAll('[data-faq-item]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: listRef.current,
            start: 'top 85%',
            end: 'bottom 15%',
            toggleActions: 'play reverse restart reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative py-24 md:py-36 px-5 md:px-8 bg-white overflow-hidden border-t border-slate-100"
    >
      {/* Background blobs for depth */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-slate-50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-[500px] h-[500px] bg-indigo-50/30 rounded-full blur-3xl" />
      </div>

      <FloatingIcons />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Sticky Header */}
          <div className="lg:col-span-5 flex flex-col justify-between lg:sticky lg:top-28 lg:h-[calc(100vh-200px)]">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                PREGUNTAS FRECUENTES
              </span>
              <TextReveal
                as="h2"
                splitBy="word"
                className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mt-4 mb-6 leading-[1.15]"
                start="top 80%"
                end="top 55%"
                scrub={0.7}
              >
                Resolvemos tus dudas antes de que aparezcan.
              </TextReveal>
              <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-md">
                ¿Tienes preguntas sobre el funcionamiento, planes o seguridad? Aquí tienes las respuestas más comunes.
              </p>
            </div>
            
            {/* Desktop WhatsApp Box */}
            <div className="hidden lg:block mt-8 p-8 rounded-3xl bg-[#f5f5f7] border border-slate-150/40">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Aún tienes preguntas?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Si no encuentras lo que buscas, nuestro equipo comercial y de soporte está disponible vía WhatsApp para ayudarte en minutos.
              </p>
              <Button
                asChild
                className="w-full h-12 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all duration-300 hover:scale-[1.02]"
              >
                <a
                  href="https://wa.me/573128470944?text=%C2%A1Hola!%20Tengo%20dudas%20sobre%20GoGi%20Reservas."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hablar con soporte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Right Column: FAQ Accordion items */}
          <div className="lg:col-span-7">
            <div ref={listRef} className="space-y-4">
              {FAQS.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={index}
                    data-faq-item
                    className={cn(
                      'group rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]',
                      isOpen
                        ? 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100'
                        : 'bg-[#f5f5f7] hover:bg-[#eaeaea] hover:scale-[1.005]'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-6 md:p-8 text-left transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className={cn(
                        'text-base md:text-lg font-semibold tracking-tight pr-6 transition-colors duration-200',
                        isOpen ? 'text-indigo-600' : 'text-slate-800 group-hover:text-slate-950'
                      )}>
                        {faq.question}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                          isOpen 
                            ? 'rotate-180 text-white bg-slate-900 shadow-md' 
                            : 'text-slate-500 bg-white shadow-sm group-hover:text-slate-800 group-hover:scale-105'
                        )}
                      >
                        <ChevronDown className="h-4 w-4 stroke-[2]" aria-hidden="true" />
                      </span>
                    </button>
                    
                    <div
                      className={cn(
                        'grid overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]',
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 md:px-8 pb-6 md:pb-8 text-sm md:text-base text-slate-500 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Footer Call to Action */}
            <div className="mt-10 lg:hidden p-6 rounded-2xl bg-[#f5f5f7] border border-slate-100 text-center">
              <h3 className="text-base font-semibold text-slate-900 mb-1">¿Aún tienes preguntas?</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Nuestro equipo comercial y de soporte está disponible vía WhatsApp para ayudarte.
              </p>
              <Button
                asChild
                className="w-full h-11 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all duration-300"
              >
                <a
                  href="https://wa.me/573128470944?text=%C2%A1Hola!%20Tengo%20dudas%20sobre%20GoGi%20Reservas."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hablar con soporte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
