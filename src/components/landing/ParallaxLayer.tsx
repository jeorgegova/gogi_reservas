/**
 * ParallaxLayer
 * Capa con movimiento parallax sincronizado al scroll.
 * En móvil reduce automáticamente la distancia para mantener el rendimiento.
 */
import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface ParallaxLayerProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
  start?: string;
  end?: string;
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.3,
  direction = 'up',
  start = 'top bottom',
  end = 'bottom top',
}: ParallaxLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !layerRef.current) return;

      const mm = gsap.matchMedia({
        '(min-width: 768px)': function () {
          const distance = 150 * speed;
          const yFrom = direction === 'up' ? distance : -distance;
          const yTo = direction === 'up' ? -distance : distance;

          gsap.fromTo(
            layerRef.current,
            { y: yFrom },
            {
              y: yTo,
              ease: 'none',
              scrollTrigger: {
                trigger: layerRef.current,
                start,
                end,
                scrub: true,
              },
            }
          );
        },
        // En móvil el parallax es mucho más sutil
        '(max-width: 767px)': function () {
          const distance = 40 * speed;
          const yFrom = direction === 'up' ? distance : -distance;
          const yTo = direction === 'up' ? -distance : distance;

          gsap.fromTo(
            layerRef.current,
            { y: yFrom },
            {
              y: yTo,
              ease: 'none',
              scrollTrigger: {
                trigger: layerRef.current,
                start,
                end,
                scrub: true,
              },
            }
          );
        },
      });

      return () => mm.revert();
    },
    { scope: layerRef, dependencies: [reducedMotion, speed, direction, start, end] }
  );

  return (
    <div
      ref={layerRef}
      className={cn('will-change-transform', className)}
      style={{ transform: reducedMotion ? 'none' : undefined }}
    >
      {children}
    </div>
  );
}
