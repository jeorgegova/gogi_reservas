import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoSinFondo from '@/assets/LogoConTextoSinfondo.png';

interface NavLink {
  label: string;
  hash: string;
  button?: boolean;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { label: 'Inicio', hash: '' },
  { label: 'Características', hash: '#caracteristicas' },
  { label: 'Funcionalidades', hash: '#funcionalidades' },
  { label: 'Industrias', hash: '#industrias' },
  { label: 'Precios', hash: '#precios' },
  { label: 'Portal Reservas', hash: '/organizaciones', button: true, external: true },
];

type Theme = 'light' | 'dark';

const sectionThemes: Record<string, Theme> = {
  industrias: 'dark',
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
      return;
    }
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', hash);
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        theme === 'dark'
          ? 'bg-slate-900/80 backdrop-blur-md border-b border-white/5'
          : scrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm'
            : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img
            src={logoSinFondo}
            alt="GoGi Reservas"
            className={`h-14 md:h-[62px] w-auto transition-all duration-300 ${
              scrolled ? 'opacity-100' : 'opacity-95'
            } ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8" aria-label="Navegación principal">
          {navLinks.map((link) =>
            link.external ? (
              <Link
                key={link.hash}
                to={link.hash}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  scrolled
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-white/90 text-slate-900 hover:bg-white shadow-lg backdrop-blur-sm'
                }`}
              >
                {link.label}
              </Link>
            ) : link.button ? (
              <button
                key={link.hash}
                onClick={() => handleNav(link.hash)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  scrolled
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-white/90 text-slate-900 hover:bg-white shadow-lg backdrop-blur-sm'
                }`}
              >
                {link.label}
              </button>
            ) : (
              <button
                key={link.hash}
                onClick={() => handleNav(link.hash)}
                className={`text-sm font-medium transition-colors duration-200 ${
                  scrolled
                    ? 'text-slate-600 hover:text-slate-900'
                    : theme === 'dark'
                      ? 'text-white/80 hover:text-white'
                      : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            )
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden p-2 rounded-lg transition-colors ${
            theme === 'dark' && !scrolled ? 'text-white/80' : 'text-slate-800'
          }`}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-5 py-4 space-y-3">
            {navLinks.map((link) =>
              link.external ? (
                <Link
                  key={link.hash}
                  to={link.hash}
                  onClick={() => setOpen(false)}
                  className="block w-full text-center rounded-full py-2.5 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
                >
                  {link.label}
                </Link>
              ) : link.button ? (
                <button
                  key={link.hash}
                  onClick={() => handleNav(link.hash)}
                  className="w-full rounded-full py-2.5 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
                >
                  {link.label}
                </button>
              ) : (
                <button
                  key={link.hash}
                  onClick={() => handleNav(link.hash)}
                  className="block text-sm font-medium text-slate-700 hover:text-slate-900 py-2 w-full text-left"
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
