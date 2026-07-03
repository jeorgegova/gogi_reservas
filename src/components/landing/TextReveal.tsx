/**
 * TextReveal
 * Revela texto palabra por palabra sincronizado con scroll.
 * En móvil la animación es más rápida y directa para mantener legibilidad.
 */
import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
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

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll('[data-reveal-item]');
    if (!elements || elements.length === 0) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elements,
        {
          opacity: isMobile ? 0.45 : 0.35,
          y: isMobile ? 12 : 16,
        },
        {
          opacity: 1,
          y: 0,
          stagger: isMobile ? 0.02 : 0.03,
          scrollTrigger: {
            trigger: containerRef.current,
            start,
            end: isMobile ? 'top 50%' : end,
            scrub: isMobile ? 0.5 : scrub,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

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
