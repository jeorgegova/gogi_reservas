/**
 * ImageReveal
 * Revela imágenes mediante combinación de escala, opacidad y clip-path.
 * En móvil simplifica el efecto para mejorar rendimiento.
 */
import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
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

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const target = imageRef.current || contentRef.current;
    if (!target) return;

    const isMobile = window.innerWidth < 768;
    const clip = clipPaths[direction];

    const ctx = gsap.context(() => {
      if (isMobile) {
        // Móvil: fade y scale suaves
        gsap.fromTo(
          containerRef.current,
          { opacity: 0.4, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 92%',
              end: 'top 65%',
              scrub: 0.4,
            },
          }
        );

        gsap.fromTo(
          target,
          { scale: 1.03 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: containerRef.current,
              start,
              end,
              scrub: 0.5,
            },
          }
        );
      } else {
        // Desktop: clip-path + escala + opacidad
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
      }
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion, direction, start, end]);

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
