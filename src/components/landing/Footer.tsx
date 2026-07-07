import { Link } from 'react-router-dom';
import { Calendar, Mail, Clock, Phone, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoConTexto from '@/assets/LogoConTexto.png';

const footerLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Organizaciones', to: '/organizaciones' },
  { label: 'Iniciar sesión', to: '/login' },
];

export function Footer() {
  return (
    <>
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
            <a href="https://wa.me/573128470944?text=Me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20GoGi%20Reservas" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Solicitar información
            </a>
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
                    <span>gogicolombia@gmail.com</span>
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-400">
                  <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Gestión de reservas inteligente</span>
                </li>
                <li>
                  <a
                    href="tel:+573128470944"
                    className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>312 847 0944</span>
                  </a>
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

    <a
      href="https://wa.me/573128470944?text=Hola,%20tengo%20dudas%20sobre%20GoGi%20Reservas"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 p-2.5 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg hover:shadow-lg hover:scale-105 transition-all duration-500 ease-in-out max-w-[44px] hover:max-w-[300px] overflow-hidden group"
      aria-label="Contactar por WhatsApp"
    >
      <div className="relative flex-shrink-0">
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
        </svg>
        <span className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping"></span>
      </div>

      <div className="text-white text-xs font-medium leading-tight whitespace-nowrap transition-all duration-500 opacity-0 translate-x-10 group-hover:opacity-100 group-hover:translate-x-0">
        <div>¿Tienes dudas?</div>
        <div className="font-bold">Escríbenos para asesorarte</div>
      </div>
    </a>
    </>
  );
}
