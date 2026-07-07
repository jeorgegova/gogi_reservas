/**
 * OrganizationsSection
 * Muestra las organizaciones registradas con animaciones de reveal sincronizadas al scroll.
 * En móvil las animaciones son más contenidas para priorizar rendimiento y legibilidad.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { supabase } from '@/lib/supabase';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TextReveal } from './TextReveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Scissors, Sparkles, Wrench, Laptop, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTerminology, type BusinessType } from '@/lib/terminology';

interface Organization {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logo_url: string | null;
  business_type: BusinessType | null;
  requires_auth: boolean;
  phone: string | null;
}

function BusinessIcon({ type, className }: { type: BusinessType | null; className?: string }) {
  const safeType = (type || 'other') as BusinessType;
  const iconProps = { className, strokeWidth: 1.5 };

  switch (safeType) {
    case 'residential':
      return <Building2 {...iconProps} />;
    case 'barbershop':
      return <Scissors {...iconProps} />;
    case 'beauty_salon':
      return <Sparkles {...iconProps} />;
    case 'workshop':
      return <Wrench {...iconProps} />;
    case 'office':
      return <Laptop {...iconProps} />;
    default:
      return <Building2 {...iconProps} />;
  }
}

export function OrganizationsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, address, logo_url, business_type, subscription_status, requires_auth, phone')
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        setOrganizations((data as Organization[]) || []);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError('No pudimos cargar las organizaciones en este momento.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('[data-org-card]');
    if (cards.length === 0) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: isMobile ? 40 : 80,
          scale: isMobile ? 0.95 : 0.92,
          filter: isMobile ? 'blur(0px)' : 'blur(8px)',
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          stagger: isMobile ? 0.06 : 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: isMobile ? 'top 85%' : 'top 80%',
            end: isMobile ? 'top 55%' : 'top 40%',
            scrub: 0.6,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion, organizations]);

  return (
    <section ref={sectionRef} id="organizaciones" className="relative py-16 md:py-48 px-5 md:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-20">
          <TextReveal
            as="h2"
            splitBy="word"
            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-slate-900 tracking-tight mb-4 md:mb-6"
            start="top 80%"
            end="top 55%"
            scrub={0.7}
          >
            Nuestra comunidad
          </TextReveal>

          <TextReveal
            as="p"
            splitBy="word"
            className="text-base md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto"
            start="top 78%"
            end="top 58%"
            scrub={0.8}
          >
            Conoce las organizaciones que confían en GoGi Reservas y accede a su portal de reservas.
          </TextReveal>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 md:py-20">
            <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 text-sm md:text-base">Cargando organizaciones...</p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto text-center py-10 md:py-12 px-5 md:px-6 rounded-3xl bg-rose-50 text-rose-700 text-sm md:text-base">
            {error}
          </div>
        )}

        {!loading && !error && organizations.length === 0 && (
          <div className="max-w-md mx-auto text-center py-10 md:py-12 px-5 md:px-6 rounded-3xl bg-slate-50 text-slate-500 text-sm md:text-base">
            Aún no hay organizaciones registradas.
          </div>
        )}

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
        >
          {organizations.map((org) => {
            const terminology = getTerminology(org.business_type);
            return (
              <div
                key={org.id}
                data-org-card
                className="group h-full flex flex-col rounded-[1.5rem] md:rounded-[2rem] bg-slate-50 p-5 md:p-6 transition-shadow duration-500 hover:shadow-xl will-change-transform"
              >
                <div className="flex items-start justify-between mb-4 md:mb-5">
                  <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <BusinessIcon type={org.business_type} className="h-6 w-6 md:h-8 md:w-8 text-slate-400" />
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn('rounded-full font-medium text-[10px] md:text-xs', terminology.badgeColor)}
                  >
                    {terminology.businessLabel}
                  </Badge>
                </div>

                <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-1 line-clamp-1">
                  {org.name}
                </h3>
                {org.address && (
                  <p className="text-xs md:text-sm text-slate-500 line-clamp-2 mb-3 md:mb-4">{org.address}</p>
                )}

                <div className="mt-auto pt-3 md:pt-4">
                  {org.requires_auth === false ? (
                    <a
                      href={`https://wa.me/${org.phone ? org.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent('Me gustaría obtener link de reserva en el portal de GoGi Reservas')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full rounded-lg md:rounded-xl font-semibold text-sm md:text-base h-10 md:h-11 px-4 md:px-5 bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5 mr-2 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Solicitar acceso
                    </a>
                  ) : (
                    <Button
                      asChild
                      className="w-full rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Link to={`/${org.slug}`}>
                        Acceder
                        <ArrowRight className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {organizations.length > 0 && (
          <div className="mt-12 md:mt-16 text-center">
            <Button
              asChild
              size="lg"
              className="h-12 md:h-14 px-6 md:px-8 rounded-full text-sm md:text-base bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
            >
              <Link to="/organizaciones">
                Ver todas las organizaciones
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
