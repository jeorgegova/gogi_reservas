import { Link } from 'react-router-dom';
import { Calendar, Mail, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoConTexto from '@/assets/LogoConTexto.png';

const footerLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Organizaciones', to: '/organizaciones' },
  { label: 'Iniciar sesión', to: '/login' },
];

export function Footer() {
  return (
    <footer className="bg-slate-950">
      {/* CTA */}
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-32 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-semibold text-white tracking-tight mb-4 md:mb-6">
          Empieza a gestionar tus reservas hoy.
        </h2>
        <p className="text-base md:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-8 md:mb-12">
          Únete a las organizaciones que ya confían en GoGi Reservas para ofrecer una experiencia premium.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 w-full sm:w-auto"
          >
            <Link to="/organizaciones">
              Explorar organizaciones
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base border-white/20 text-white bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img src={logoConTexto} alt="GoGi Reservas" className="h-10 md:h-12 w-auto brightness-0 invert" />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              La plataforma donde cada espacio, servicio y momento se gestiona con la elegancia de una experiencia premium.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navegación
            </h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / Info */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Información
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Disponible 24/7</span>
              </li>
              <li>
                <a
                  href="mailto:contacto@gogireservas.com"
                  className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors duration-200"
                >
                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>contacto@gogireservas.com</span>
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Gestión de reservas inteligente</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 md:mt-14 pt-6 md:pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} GoGi Reservas. Todos los derechos reservados.</p>
          <p className="text-center md:text-right">
            Hecho con dedicación para simplificar la gestión de reservas.
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}
