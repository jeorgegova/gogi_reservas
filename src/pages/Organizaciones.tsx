import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Scissors, Sparkles, Wrench, Laptop, ArrowRight, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTerminology, type BusinessType } from '@/lib/terminology';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

interface Organization {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logo_url: string | null;
  business_type: BusinessType | null;
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

export default function OrganizacionesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filtered, setFiltered] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, address, logo_url, business_type, subscription_status')
          .eq('subscription_status', 'active')
          .order('name', { ascending: true });

        if (error) throw error;
        const orgs = (data as Organization[]) || [];
        setOrganizations(orgs);
        setFiltered(orgs);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError('No pudimos cargar las organizaciones en este momento.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(organizations);
      return;
    }
    setFiltered(
      organizations.filter(
        (org) =>
          org.name.toLowerCase().includes(q) ||
          org.address?.toLowerCase().includes(q) ||
          (org.business_type && getTerminology(org.business_type).businessLabel.toLowerCase().includes(q))
      )
    );
  }, [search, organizations]);

  return (
    <div className="min-h-screen bg-white pt-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 md:py-20">
        {/* Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-tight mb-3">
            Organizaciones
          </h1>
          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto">
            Explora todas las organizaciones registradas y accede directamente a su portal de reservas.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-10 md:mb-14">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar organización..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 md:h-14 rounded-2xl border-slate-200 bg-slate-50 text-base focus-visible:ring-slate-400"
            />
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500">Cargando organizaciones...</p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto text-center py-12 px-6 rounded-3xl bg-rose-50 text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="max-w-md mx-auto text-center py-12 px-6 rounded-3xl bg-slate-50">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              {search ? 'No encontramos organizaciones con ese nombre.' : 'Aún no hay organizaciones registradas.'}
            </p>
            <p className="text-slate-400 text-sm">
              {search ? 'Intenta con otro término de búsqueda.' : 'Vuelve más tarde para descubrir nuevas organizaciones.'}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((org) => {
            const terminology = getTerminology(org.business_type);
            return (
              <Link
                key={org.id}
                to={`/${org.slug}`}
                className="group h-full flex flex-col rounded-[1.5rem] md:rounded-[2rem] bg-slate-50 p-5 md:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 will-change-transform"
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

                <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-1 line-clamp-1">
                  {org.name}
                </h2>
                {org.address && (
                  <p className="text-xs md:text-sm text-slate-500 line-clamp-2 mb-3 md:mb-4">{org.address}</p>
                )}

                <div className="mt-auto pt-3 md:pt-4">
                  <Button
                    className="w-full rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Acceder
                    <ArrowRight className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
