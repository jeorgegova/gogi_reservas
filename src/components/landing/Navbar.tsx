import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoSinFondo from '@/assets/LogoConTextoSinfondo.png';
import { cn } from '@/lib/utils';

interface NavLink {
  label: string;
  hash: string;
  button?: boolean;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { label: 'Inicio', hash: '' },
  { label: 'Características', hash: '#caracteristicas' },
  { label: 'Cómo funciona', hash: '#como-funciona' },
  { label: 'Industrias', hash: '#industrias' },
  { label: 'Precios', hash: '#precios' },
  { label: 'FAQ', hash: '#faq' },
  { label: 'Portal Reservas', hash: '/organizaciones', button: true, external: true },
];

type Theme = 'light' | 'dark';

const sectionThemes: Record<string, Theme> = {
  industrias: 'dark',
  confianza: 'dark',
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const location = useLocation();

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
      window.location.href = '/' + hash;
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

  const handleMouseLeave = () => {
    setPillStyle((prev) => ({
      ...prev,
      opacity: 0,
    }));
  };

  return (
    <header
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 transition-all duration-500 rounded-2xl ${theme === 'dark'
          ? 'bg-slate-900/70 border border-white/10 backdrop-blur-lg shadow-xl shadow-slate-950/20'
          : scrolled
            ? 'bg-white/70 border border-slate-200/50 backdrop-blur-lg shadow-lg shadow-slate-200/20'
            : 'bg-transparent border border-transparent'
        }`}
    >
      <div className="px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
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
            className={`h-10 md:h-[48px] w-auto transition-all duration-300 ${scrolled ? 'opacity-100' : 'opacity-95'
              } ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
            loading="eager"
            decoding="async"
          />
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1.5 relative py-2"
          aria-label="Navegación principal"
          onMouseLeave={handleMouseLeave}
        >
          {/* Sliding Pill Background */}
          <div
            className="absolute h-8 rounded-full bg-slate-100/70 dark:bg-white/10 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none z-0"
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
                className={cn(
                  "text-sm font-medium transition-colors duration-300 rounded-full px-3.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 z-10 relative",
                  theme === 'dark'
                    ? active
                      ? "text-white font-bold"
                      : "text-white/80 hover:text-white"
                    : scrolled
                      ? active
                        ? "text-indigo-650 font-semibold"
                        : "text-slate-650 hover:text-slate-900"
                      : active
                        ? "text-indigo-600 font-semibold"
                        : "text-slate-700 hover:text-slate-900"
                )}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden p-2 rounded-lg transition-colors ${theme === 'dark' && !scrolled ? 'text-white/80' : 'text-slate-800'
            }`}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-white/5 rounded-b-2xl overflow-hidden backdrop-blur-lg">
          <div className="px-5 py-4 space-y-3">
            {navLinks.map((link) =>
              link.external ? (
                <Link
                  key={link.hash}
                  to={link.hash}
                  onClick={() => setOpen(false)}
                  className="block w-full text-center rounded-full py-2.5 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              ) : link.button ? (
                <button
                  key={link.hash}
                  onClick={() => handleNav(link.hash)}
                  className="w-full rounded-full py-2.5 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  {link.label}
                </button>
              ) : (
                <button
                  key={link.hash}
                  onClick={() => handleNav(link.hash)}
                  className="block text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white py-2 w-full text-left"
                >
                  {link.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
