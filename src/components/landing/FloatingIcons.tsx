import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import {
  Calendar,
  MapPin,
  Clock,
  Scissors,
  Sparkles,
  Repeat,
  Bell,
  Store,
  UserCheck,
  CalendarDays,
  ShieldCheck,
  Map,
  Coins,
  History
} from 'lucide-react';

const ICONS = [
  { Icon: Calendar },
  { Icon: MapPin },
  { Icon: Clock },
  { Icon: Scissors },
  { Icon: Sparkles },
  { Icon: Repeat },
  { Icon: Bell },
  { Icon: Store },
  { Icon: UserCheck },
  { Icon: CalendarDays },
  { Icon: ShieldCheck },
  { Icon: Map },
  { Icon: Coins },
  { Icon: History },
];

export function FloatingIcons() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current) return;

    const items = sectionRef.current.querySelectorAll('[data-floating-icon]');
    const isMobile = window.innerWidth < 768;
    const cols = isMobile ? 4 : 5;
    const rows = isMobile ? 5 : 6;
    const occupiedCells = new Set<string>();

    const getAvailableCell = (): { col: number; row: number } | null => {
      const available: { col: number; row: number }[] = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const key = `${c}-${r}`;
          if (!occupiedCells.has(key)) {
            available.push({ col: c, row: r });
          }
        }
      }
      if (available.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * available.length);
      return available[randomIndex];
    };

    const ctx = gsap.context(() => {
      items.forEach((item) => {
        let currentCellKey: string | null = null;

        const runCycle = (firstTime = false) => {
          if (currentCellKey) {
            occupiedCells.delete(currentCellKey);
            currentCellKey = null;
          }

          const cell = getAvailableCell();
          if (!cell) {
            gsap.delayedCall(1, () => runCycle(firstTime));
            return;
          }

          currentCellKey = `${cell.col}-${cell.row}`;
          occupiedCells.add(currentCellKey);

          const colWidth = 90 / cols;
          const rowHeight = 90 / rows;
          const baseX = 5 + cell.col * colWidth;
          const baseY = 5 + cell.row * rowHeight;

          const offsetX = gsap.utils.random(0, colWidth * 0.4);
          const offsetY = gsap.utils.random(0, rowHeight * 0.4);

          const startX = baseX + offsetX;
          const startY = baseY + offsetY;

          const driftX = gsap.utils.random(-40, 40);
          const driftY = gsap.utils.random(-40, 40);

          const duration = gsap.utils.random(8, 14);
          const maxOpacity = gsap.utils.random(0.15, 0.25);

          if (firstTime) {
            const initialDelay = gsap.utils.random(0, 4);
            gsap.set(item, {
              xPercent: -50,
              yPercent: -50,
              left: `${startX}%`,
              top: `${startY}%`,
              x: 0,
              y: 0,
              opacity: 0,
              scale: gsap.utils.random(0.8, 1.2),
            });

            gsap.timeline({
              delay: initialDelay,
              onComplete: () => runCycle(false),
            })
              .to(item, {
                opacity: maxOpacity,
                x: driftX / 2,
                y: driftY / 2,
                duration: duration / 2,
                ease: 'sine.out',
              })
              .to(item, {
                opacity: 0,
                x: driftX,
                y: driftY,
                duration: duration / 2,
                ease: 'sine.in',
              });
          } else {
            gsap.set(item, {
              left: `${startX}%`,
              top: `${startY}%`,
              x: 0,
              y: 0,
              opacity: 0,
              scale: gsap.utils.random(0.8, 1.2),
            });

            gsap.timeline({
              onComplete: () => runCycle(false),
            })
              .to(item, {
                opacity: maxOpacity,
                x: driftX / 2,
                y: driftY / 2,
                duration: duration / 2,
                ease: 'sine.out',
              })
              .to(item, {
                opacity: 0,
                x: driftX,
                y: driftY,
                duration: duration / 2,
                ease: 'sine.in',
              });
          }
        };

        runCycle(true);
      });
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, [reducedMotion]);

  return (
    <div ref={sectionRef} className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {ICONS.map(({ Icon }, i) => (
        <div
          key={i}
          data-floating-icon
          className="absolute text-slate-300 pointer-events-none select-none"
          style={{ opacity: 0 }}
        >
          <Icon className="h-7 w-7 md:h-16 md:w-16" strokeWidth={1.2} />
        </div>
      ))}
    </div>
  );
}
