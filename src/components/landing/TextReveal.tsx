/**
 * TextReveal
 * Revela texto palabra por palabra sincronizado con scroll.
 * En móvil la animación es más rápida y sin rotación para mantener legibilidad.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface TextRevealProps {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  splitBy?: 'word' | 'line';
  start?: string;
  end?: string;
  scrub?: boolean | number;
}

export function TextReveal({
  children,
  className,
  as: Tag = 'p',
  splitBy = 'word',
  start = 'top 80%',
  end = 'top 40%',
  scrub = 0.8,
}: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const elements = containerRef.current.querySelectorAll('[data-reveal-item]');
      if (!elements || elements.length === 0) return;

      const mm = gsap.matchMedia({
        // Desktop: reveal suave con ligero movimiento vertical
        '(min-width: 768px)': function () {
          gsap.fromTo(
            elements,
            {
              opacity: 0.35,
              y: 16,
            },
            {
              opacity: 1,
              y: 0,
              stagger: 0.03,
              scrollTrigger: {
                trigger: containerRef.current,
                start,
                end,
                scrub,
              },
            }
          );
        },
        // Móvil: reveal más rápido y directo
        '(max-width: 767px)': function () {
          gsap.fromTo(
            elements,
            {
              opacity: 0.45,
              y: 12,
            },
            {
              opacity: 1,
              y: 0,
              stagger: 0.02,
              scrollTrigger: {
                trigger: containerRef.current,
                start,
                end: 'top 50%',
                scrub: 0.5,
              },
            }
          );
        },
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  const items = splitBy === 'word' ? children.split(' ') : [children];

  return (
    <div ref={containerRef} className="overflow-hidden">
      <Tag className={cn('inline', className)}>
        {items.map((item, index) => (
          <span
            key={index}
            data-reveal-item
            className="inline-block mr-[0.25em] will-change-transform"
            style={{ opacity: reducedMotion ? 1 : undefined }}
          >
            {item}
          </span>
        ))}
      </Tag>
    </div>
  );
}
