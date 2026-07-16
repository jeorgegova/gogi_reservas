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
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: listRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
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
      className="relative py-20 md:py-32 px-5 md:px-6 bg-[#fafafa] overflow-hidden border-t border-slate-100"
    >
      <FloatingIcons />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-16 md:mb-24">
          <span className="text-xs font-bold tracking-widest text-indigo-650 uppercase bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100/50">
            Preguntas frecuentes
          </span>
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight mt-6 mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Resolvemos tus dudas antes de que aparezcan.
          </TextReveal>
        </div>

        <div ref={listRef} className="border-t border-slate-200">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                data-faq-item
                className="border-b border-slate-200 py-6 transition-colors duration-300"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left group py-2"
                  aria-expanded={isOpen}
                >
                  <span className={cn(
                    "text-base md:text-lg font-medium text-slate-800 transition-colors duration-300 pr-6",
                    isOpen ? "text-indigo-600" : "group-hover:text-indigo-600"
                  )}>
                    {faq.question}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      isOpen ? 'rotate-180 text-indigo-650 bg-indigo-50' : 'text-slate-400 group-hover:text-slate-650'
                    )}
                  >
                    <ChevronDown className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
                  </span>
                </button>
                <div
                  className={cn(
                    'grid overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    isOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm md:text-base text-slate-500 leading-relaxed pr-8">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 md:mt-24 text-center">
          <p className="text-sm md:text-base text-slate-500 mb-6">
            ¿Aún tienes dudas? Empieza gratis y descubre la plataforma por ti mismo.
          </p>
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
          >
            <a
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Quiero%20probar%20GoGi%20Reservas%20gratis%20para%20mi%20negocio."
              target="_blank"
              rel="noopener noreferrer"
            >
              Comenzar ahora gratis
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
