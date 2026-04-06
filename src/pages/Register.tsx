import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { translateAuthError } from '@/lib/utils';
import { useOrganizationImages } from '@/hooks/useOrganizationImages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HabeasData } from '@/components/ui/habeas-data';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { UserPlus, Building2 } from 'lucide-react';
import { getTerminology } from '@/lib/terminology';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [apartment, setApartment] = useState('');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccessAlertOpen, setIsSuccessAlertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const { slug } = useParams();
  const navigate = useNavigate();
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const { cachedImages, cacheImages } = useOrganizationImages(slug);

  useEffect(() => {
    fetchOrganizations();
  }, [slug]);

  const fetchOrganizations = async () => {
    // Allow organizations with active or pending_validation subscription status
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .in('subscription_status', ['active', 'pending_validation']);

    if (data) {
      setOrganizations(data);
      if (slug) {
        const org = data.find(o => o.slug === slug);
        if (org) {
          setSelectedOrgId(org.id);
          setCurrentOrg(org);
          cacheImages(org.logo_url, org.login_photo_url);
        } else if (data.length > 0) {
          setSelectedOrgId(data[0].id);
          setCurrentOrg(data[0]);
        }
      } else if (data.length > 0) {
        setSelectedOrgId(data[0].id);
        setCurrentOrg(data[0]);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!habeasDataAccepted) {
      setError('Debe aceptar el tratamiento de datos personales para continuar');
      setLoading(false);
      return;
    }

    if (!selectedOrgId) {
      setError('Por favor seleccione una organización');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            phone: phone,
            apartment: apartment,
            organization_id: selectedOrgId,
            habeas_data_accepted: true,
            habeas_data_accepted_at: new Date().toISOString(),
          },
        },
      });

      console.log("Data del registrer", data);
      if (error) throw error;

      setIsSuccessAlertOpen(true);
    } catch (error: any) {
      setError(translateAuthError(error.message) || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat animate-slow-zoom transition-all duration-1000"
        style={{
          backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <Card className="relative z-10 w-full max-w-lg border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center pb-6 pt-10">
          <div className="flex justify-center mb-6">
            {currentOrg?.logo_url || cachedImages.logo_url ? (
              <img
                src={currentOrg?.logo_url || cachedImages.logo_url || ''}
                alt="Logo"
                className="w-40 h-auto object-contain animate-in fade-in slide-in-from-top-6 duration-1000"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Building2 className="h-12 w-12 text-white/80" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white drop-shadow-md text-center pb-2">
            Crear Cuenta
          </CardTitle>
          <CardDescription className="text-blue-100/90 text-sm font-medium">
            {currentOrg ? `Únete a ${currentOrg.name}` : `Crea tu cuenta de ${getTerminology().userLabel.toLowerCase()} para empezar`}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-destructive/20 text-white text-sm p-3 rounded-xl border border-destructive/30 backdrop-blur-md animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white font-medium ml-1">Nombre Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium ml-1">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white font-medium ml-1">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>

              {(!currentOrg || currentOrg.business_type === 'residential') && (
                <div className="space-y-2">
                  <Label htmlFor="apartment" className="text-white font-medium ml-1">
                    {getTerminology(currentOrg?.business_type).unitLabel}
                  </Label>
                  <Input
                    id="apartment"
                    type="text"
                    placeholder={getTerminology(currentOrg?.business_type).unitPlaceholder}
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>
              )}
            </div>

            {!slug && (
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-white font-medium ml-1">
                  {getTerminology(currentOrg?.business_type).businessLabel}
                </Label>
                <select
                  id="organization"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  required
                  className="w-full bg-white/10 border-white/20 text-white h-11 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 px-3 outline-none appearance-none"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id} className="text-gray-900">
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" title="Mínimo 6 caracteres" className="text-white font-medium ml-1">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>

            {/* Habeas Data - Tratamiento de Datos Personales */}
            <HabeasData
              accepted={habeasDataAccepted}
              onAccept={setHabeasDataAccepted}
            />

            <Button
              type="submit"
              className="w-full h-12 mt-4 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Registrarme como {getTerminology(currentOrg?.business_type).userLabel}
                </div>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pb-10 px-8">
          <div className="w-full flex items-center justify-center gap-4 py-1">
            <div className="h-px bg-white/20 flex-1"></div>
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">o</span>
            <div className="h-px bg-white/20 flex-1"></div>
          </div>
          <div className="text-sm text-center text-blue-100/80">
            <Link to={slug ? `/${slug}/login` : "/"} className="text-white font-bold hover:underline decoration-2 underline-offset-4 decoration-primary/50 transition-all">
              Inicia sesión
            </Link>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog
        open={isSuccessAlertOpen}
        onOpenChange={(open) => {
          setIsSuccessAlertOpen(open);
          if (!open) navigate(slug ? `/${slug}/login` : "/");
        }}
        title="¡Registro Exitoso!"
        description="Tu cuenta ha sido creada correctamente. Por favor, verifica tu correo electrónico para confirmar tu registro antes de iniciar sesión."
        confirmText="Ir al Login"
        showCancel={false}
        onConfirm={() => navigate(slug ? `/${slug}/login` : "/")}
      />
    </div>
  );
}
