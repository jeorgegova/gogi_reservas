/**
 * ImageReveal
 * Revela imágenes mediante combinación de escala, opacidad y clip-path.
 * En móvil simplifica el efecto para mejorar rendimiento.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface ImageRevealProps {
  src?: string;
  alt?: string;
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  start?: string;
  end?: string;
}

export function ImageReveal({
  src,
  alt = '',
  children,
  className,
  containerClassName,
  direction = 'up',
  start = 'top 85%',
  end = 'top 35%',
}: ImageRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const clipPaths: Record<string, { from: string; to: string }> = {
    up: {
      from: 'inset(100% 0 0 0)',
      to: 'inset(0% 0 0 0)',
    },
    down: {
      from: 'inset(0 0 100% 0)',
      to: 'inset(0 0 0% 0)',
    },
    left: {
      from: 'inset(0 100% 0 0)',
      to: 'inset(0 0% 0 0)',
    },
    right: {
      from: 'inset(0 0 0 100%)',
      to: 'inset(0 0 0 0%)',
    },
  };

  useGSAP(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const target = imageRef.current || contentRef.current;
      if (!target) return;

      const mm = gsap.matchMedia({
        // Desktop: clip-path + escala + opacidad
        '(min-width: 768px)': function () {
          const clip = clipPaths[direction];

          gsap.fromTo(
            containerRef.current,
            { clipPath: clip.from },
            {
              clipPath: clip.to,
              ease: 'none',
              scrollTrigger: {
                trigger: containerRef.current,
                start,
                end,
                scrub: 0.6,
              },
            }
          );

          gsap.fromTo(
            target,
            { scale: 1.2, opacity: 0.8 },
            {
              scale: 1,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: containerRef.current,
                start,
                end,
                scrub: 0.6,
              },
            }
          );
        },
        // Móvil: fade y scale simples, sin clip-path
        '(max-width: 767px)': function () {
          gsap.fromTo(
            containerRef.current,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 90%',
                end: 'top 60%',
                scrub: 0.5,
              },
            }
          );

          gsap.fromTo(
            target,
            { scale: 1.05 },
            {
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: containerRef.current,
                start,
                end,
                scrub: 0.6,
              },
            }
          );
        },
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [reducedMotion, direction, start, end] }
  );

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden will-change-[clip-path,opacity,transform]', containerClassName)}
      style={{ clipPath: reducedMotion ? 'inset(0)' : undefined }}
    >
      {src ? (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={cn('h-full w-full object-cover will-change-transform', className)}
        />
      ) : (
        <div ref={contentRef} className={cn('h-full w-full', className)}>
          {children}
        </div>
      )}
    </div>
  );
}
