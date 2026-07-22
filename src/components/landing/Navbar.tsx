import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Star,
  Workflow,
  Building2,
  DollarSign,
  HelpCircle,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import logoSinFondo from '@/assets/LogoConTextoSinfondo.png';
import { cn } from '@/lib/utils';

interface NavLink {
  label: string;
  hash: string;
  icon: typeof Home;
  button?: boolean;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { label: 'Inicio', hash: '', icon: Home },
  { label: 'Características', hash: '#caracteristicas', icon: Star },
  { label: 'Cómo funciona', hash: '#como-funciona', icon: Workflow },
  { label: 'Industrias', hash: '#industrias', icon: Building2 },
  { label: 'Precios', hash: '#precios', icon: DollarSign },
  { label: 'FAQ', hash: '#faq', icon: HelpCircle },
  { label: 'Portal Reservas', hash: '/organizaciones', icon: CalendarCheck, button: true, external: true },
];

type Theme = 'light' | 'dark';

const sectionThemes: Record<string, Theme> = {
  confianza: 'dark',
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/organizaciones') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);

  // Sliding pill states
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    if (location.pathname !== '/') return;

    const sectionIds = ['hero', 'caracteristicas', 'como-funciona', 'industrias', 'precios', 'faq'];

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the entry that has the highest intersection ratio or is currently intersecting
      const intersecting = entries.filter(e => e.isIntersecting);
      if (intersecting.length > 0) {
        // Sort by how close they are to the top of the viewport
        intersecting.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const id = intersecting[0].target.id;
        setActiveSection(id === 'hero' ? '' : `#${id}`);
      }
    };

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.1, 0.2],
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });

    // Also fallback / set initial state on scroll
    const handleScrollFallback = () => {
      if (window.scrollY < 100) {
        setActiveSection('');
      }
    };
    window.addEventListener('scroll', handleScrollFallback, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollFallback);
    };
  }, [location.pathname]);

  useEffect(() => {
    const checkSection = () => {
      const navHeight = 80;
      let currentTheme: Theme = 'light';

      for (const [id, t] of Object.entries(sectionThemes)) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= navHeight && rect.bottom > navHeight) {
          currentTheme = t;
          break;
        }
      }

      const footer = document.querySelector('footer');
      if (footer) {
        const rect = footer.getBoundingClientRect();
        if (rect.top <= navHeight && rect.bottom > navHeight) {
          currentTheme = 'dark';
        }
      }

      setTheme(currentTheme);
    };

    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      checkSection();
    };

    checkSection();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (hash: string) => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.replaceState(null, '', window.location.pathname);
      setActiveSection('');
      return;
    }
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', hash);
      setActiveSection(hash);
    }
  };

  const handleNav = (hash: string) => {
    setOpen(false);
    if (location.pathname === '/') {
      scrollTo(hash);
    } else {
      window.location.assign('/' + hash);
    }
  };

  const isActiveLink = (hash: string): boolean => {
    if (hash.startsWith('/')) return location.pathname === hash;
    if (location.pathname !== '/') return false;
    return activeSection === hash;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    setPillStyle({
      left: target.offsetLeft,
      width: target.offsetWidth,
      opacity: 1,
    });
  };

  const handleDesktopMouseLeave = () => {
    setIsDesktopHovering(false);
  };

  const handleDesktopMouseEnter = () => {
    setIsDesktopHovering(true);
  };

  // Mobile sliding pill state
  const [mobilePillStyle, setMobilePillStyle] = useState<React.CSSProperties>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Desktop nav active pill tracking
  const [isDesktopHovering, setIsDesktopHovering] = useState(false);
  const desktopNavRef = useRef<HTMLElement>(null);

  // Sincronizar la pastilla magnética desktop con la sección activa (solo cuando no está hovereando)
  useEffect(() => {
    if (isDesktopHovering || !desktopNavRef.current) return;
    const activeBtn = desktopNavRef.current.querySelector('[data-desktop-active="true"]') as HTMLElement | null;
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 0.4,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeSection, isDesktopHovering]);

  // Actualizar la pastilla magnética móvil cuando cambia la sección activa
  useEffect(() => {
    if (!mobileNavRef.current) return;
    const activeBtn = mobileNavRef.current.querySelector('[data-mobile-active="true"]') as HTMLElement | null;
    if (activeBtn) {
      setMobilePillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 1,
      });
    } else {
      setMobilePillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeSection]);

  return (
    <header
      className={cn(
        "fixed top-2 md:top-4 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-7xl z-50 transition-all duration-500 rounded-2xl md:rounded-3xl",
        theme === 'dark'
          ? 'bg-slate-900/80 border border-white/15 backdrop-blur-lg shadow-xl shadow-slate-950/30 text-white'
          : scrolled
            ? 'bg-white/[0.22] border border-white/70 backdrop-blur-2xl shadow-md shadow-indigo-100/20 supports-[backdrop-filter]:bg-white/[0.15] text-slate-900'
            : 'bg-white/15 border border-white/35 backdrop-blur-xl shadow-none supports-[backdrop-filter]:bg-white/[0.10] text-slate-900'
      )}
    >
      <div className="px-2.5 sm:px-4 md:px-6 h-12 sm:h-14 md:h-16 flex items-center justify-between">
        <Link
          to="/"
          className="shrink-0 flex items-center"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="GoGi Reservas - Inicio"
        >
          <img
            src={logoSinFondo}
            alt="GoGi Reservas - Software de reservas y agenda online"
            width="134"
            height="200"
            className={cn(
              "h-8 sm:h-9 md:h-[48px] w-auto transition-all duration-300",
              scrolled ? 'opacity-100' : 'opacity-95',
              theme === 'dark' ? 'brightness-0 invert' : ''
            )}
            loading="eager"
            decoding="async"
          />
        </Link>

        {/* Desktop nav */}
        <nav
          ref={desktopNavRef}
          className="hidden md:flex items-center gap-1.5 relative py-2"
          aria-label="Navegación principal"
          onMouseEnter={handleDesktopMouseEnter}
          onMouseLeave={handleDesktopMouseLeave}
        >
          {/* Sliding Pill Background */}
          <div
            className={cn(
              "absolute h-8 rounded-full border backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none z-0",
              isDesktopHovering
                ? "border-indigo-200/70 bg-indigo-100/55 shadow-[0_6px_18px_rgba(129,140,248,0.16)] dark:border-white/10 dark:bg-white/10 dark:shadow-none"
                : "border-indigo-300/70 bg-indigo-200/50 shadow-[0_6px_18px_rgba(129,140,248,0.2)] dark:border-white/15 dark:bg-white/15 dark:shadow-none"
            )}
            style={pillStyle}
          />

          {navLinks.map((link) => {
            const active = isActiveLink(link.hash);

            const btnClass = theme === 'dark'
              ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-md'
              : scrolled
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                : 'bg-white/90 text-slate-900 hover:bg-white shadow-lg backdrop-blur-sm';

            if (link.external) {
              return (
                <Link
                  key={link.hash}
                  to={link.hash}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 z-10 ${btnClass}`}
                >
                  {link.label}
                </Link>
              );
            }

            if (link.button) {
              return (
                <button
                  key={link.hash}
                  onClick={() => handleNav(link.hash)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 z-10 ${btnClass}`}
                >
                  {link.label}
                </button>
              );
            }

            return (
              <button
                key={link.hash}
                onClick={() => handleNav(link.hash)}
                onMouseEnter={handleMouseEnter}
                aria-current={active ? 'page' : undefined}
                data-desktop-active={active ? 'true' : undefined}
                className={cn(
                  "text-sm font-medium transition-colors duration-300 rounded-full px-3.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 z-10 relative",
                  theme === 'dark'
                    ? active
                      ? "text-white font-extrabold"
                      : "text-white/80 hover:text-white"
                    : scrolled
                      ? active
                        ? "text-slate-950 font-extrabold"
                        : "text-slate-650 hover:text-slate-900"
                      : active
                        ? "text-slate-950 font-extrabold"
                        : "text-slate-700 hover:text-slate-900"
                )}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile: Barra rápida horizontal con deslizado magnético y color dinámico */}
        <div className="md:hidden flex items-center gap-1">
          <div
            ref={mobileNavRef}
            className={cn(
              "relative flex items-center gap-0.5 p-1 rounded-full border backdrop-blur-md transition-colors duration-500",
              theme === 'dark'
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white/35 border-white/50 text-slate-800"
            )}
          >
            {/* Sliding Pill magnética móvil */}
            <div
              className={cn(
                "absolute h-7 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0 shadow-xs",
                theme === 'dark'
                  ? "bg-white text-slate-950"
                  : "bg-slate-900 text-white"
              )}
              style={mobilePillStyle}
            />

            {navLinks.filter((l) => !l.button).map((link) => {
              const active = isActiveLink(link.hash);
              const Icon = link.icon;
              return (
                <button
                  key={link.hash}
                  onClick={() => handleNav(link.hash)}
                  data-mobile-active={active ? 'true' : 'false'}
                  title={link.label}
                  aria-label={link.label}
                  className={cn(
                    "relative z-10 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-colors duration-300 active:scale-90",
                    active
                      ? theme === 'dark' ? "text-slate-950" : "text-white"
                      : theme === 'dark' ? "text-white/80 hover:text-white" : "text-slate-700 hover:text-slate-950"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              );
            })}
          </div>

          {/* Botón Toggle Cristal Líquido */}
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "h-8 px-2.5 rounded-full flex items-center gap-1 transition-all duration-300 active:scale-95 border backdrop-blur-xl",
              theme === 'dark'
                ? "bg-white/15 text-white border-white/25 shadow-md shadow-slate-950/20"
                : "bg-slate-900/90 text-white border-white/20 shadow-md shadow-slate-900/10"
            )}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            {open ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Estilo Liquid Glass Adaptable al Fondo */}
      {open && (
        <div className={cn(
          "md:hidden rounded-b-2xl overflow-hidden border-t transition-all duration-300 animate-in fade-in slide-in-from-top-2 text-white",
          theme === 'dark'
            ? 'bg-slate-900/80 border-white/10 backdrop-blur-xl shadow-2xl shadow-slate-950/40'
            : 'bg-slate-900/80 border-white/10 backdrop-blur-xl shadow-2xl shadow-slate-950/40'
        )}>
          <div className="p-4 space-y-2 max-h-[75vh] overflow-y-auto">
            <p className="px-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Navegación por Secciones
            </p>

            {navLinks.map((link) => {
              const active = isActiveLink(link.hash);
              const Icon = link.icon;

              if (link.external || link.button) {
                return (
                  <div key={link.hash} className="pt-2">
                    <Link
                      to={link.hash}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between w-fit min-w-[220px] mx-auto rounded-4xl py-3 px-4 text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
                        "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white shadow-lg shadow-slate-950/20 border border-slate-500/40"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-bold tracking-wide">{link.label}</span>
                      </span>
                    </Link>
                  </div>
                );
              }

              return (
                <button
                  key={link.hash}
                  onClick={() => {
                    handleNav(link.hash);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-300 text-left active:scale-[0.99]",
                    active
                      ? "bg-slate-900/90 text-white font-bold dark:bg-white dark:text-slate-950 shadow-md border border-slate-700/50 backdrop-blur-md"
                      : "text-slate-900 hover:bg-white/40 dark:text-slate-200 dark:hover:bg-white/10 border border-transparent"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-xs backdrop-blur-md",
                      active
                        ? "bg-white/20 text-white dark:bg-slate-950 dark:text-white"
                        : "bg-white/50 text-slate-800 dark:bg-white/10 dark:text-slate-300 border border-white/60"
                    )}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span>{link.label}</span>
                  </span>

                  <ChevronRight className="h-4 w-4 text-slate-400 opacity-70" />
                </button>
              );
            })}
          </div>

          {/* Footer del menú cristal líquido */}
          <div className="p-3.5 bg-white/40 dark:bg-slate-950/40 border-t border-white/40 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 backdrop-blur-md">
            <span className="font-medium text-slate-600 dark:text-slate-400">GoGi Reservas</span>
            <a
              href="https://wa.me/573128470944?text=%C2%A1Hola!%20Tengo%20una%20consulta."
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-900 dark:text-white font-bold underline decoration-emerald-500 underline-offset-4"
            >
              Contacto soporte
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
