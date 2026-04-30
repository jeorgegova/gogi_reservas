import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationImages } from '@/hooks/useOrganizationImages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Building2, Eye, EyeOff } from 'lucide-react';
import { cn, translateAuthError } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { profile, loading: authLoading, isGuest, setGuestMode } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const { cachedImages, cacheImages } = useOrganizationImages(slug);

  useEffect(() => {
    if (slug) {
      fetchOrganization();
    }
  }, [slug]);

  const fetchOrganization = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();
    if (data) {
      setOrganization(data);
      // Guardar imágenes en caché
      cacheImages(data.logo_url, data.login_photo_url);
    }
  };

  // Redirigir si ya está autenticado o es invitado - solo ejecutar una vez
  useEffect(() => {
    if ((profile || isGuest) && !authLoading) {
      if (profile?.role === 'super_admin') {
        navigate('/super-admin/organizations', { replace: true });
        return;
      }

      if (isGuest && profile?.organization_slug === slug) {
        navigate(`/${slug}`, { replace: true });
        return;
      }

      if (profile && !isGuest && profile.organization_slug === slug) {
        const targetSlug = slug || profile?.organization_slug;
        if (targetSlug) {
          localStorage.setItem('lastOrganizationSlug', targetSlug);
          navigate(`/${targetSlug}`, { replace: true });
        }
        return;
      }
    }
  }, [profile, isGuest, authLoading, slug, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('LoginPage: Llamando a signInWithPassword...', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error de Supabase Auth:', error);
        throw error;
      }

      console.log('Inicio de sesión exitoso, usuario:', data.user?.id);
      // La redirección real se maneja en el useEffect arriba basado en el perfil
    } catch (err: any) {
      console.error('Captura de error en Login.tsx:', err);
      setError(translateAuthError(err.message || 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (organization?.guest_user_id && slug) {
      setLoading(true);
      await setGuestMode(organization.guest_user_id);
      localStorage.setItem('lastOrganizationSlug', slug);
      navigate(`/${slug}`, { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className={cn(
          "absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000",
          !slug ? "bg-white" : "animate-slow-zoom"
        )}
        style={{
          backgroundImage: slug && cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none',
        }}
      >
        {slug && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <Card className={cn(
        "relative z-10 w-full max-w-md shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500",
        !slug ? "bg-white border-gray-100" : "border-white/20 bg-white/10 backdrop-blur-xl"
      )}>
        <CardHeader className="space-y-1 text-center pb-8 pt-10">
          {slug && (
            <div className="flex justify-center mb-8">
              {organization?.logo_url || cachedImages.logo_url ? (
                <img
                  src={organization?.logo_url || cachedImages.logo_url || ''}
                  alt="Logo"
                  className="w-48 h-auto object-contain animate-in fade-in slide-in-from-top-6 duration-1000"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Building2 className="h-14 w-14 text-white/80" />
                </div>
              )}
            </div>
          )}
          <CardTitle className={cn(
            "text-3xl font-bold tracking-tight text-center pb-2",
            !slug ? "text-gray-900" : "text-white drop-shadow-md"
          )}>
            {organization?.name || 'Administración Central'}
          </CardTitle>
        </CardHeader>

        <CardContent className={cn("px-8", !slug && "pb-12")}>
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-destructive/20 text-white text-sm p-3 rounded-xl border border-destructive/30 backdrop-blur-md animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className={cn("font-medium ml-1", !slug ? "text-gray-700" : "text-white")}>Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  "h-12 rounded-2xl transition-all duration-300",
                  !slug
                    ? "bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500/20"
                    : "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-primary/50"
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className={cn("font-medium", !slug ? "text-gray-700" : "text-white")}>Contraseña</Label>
                {slug && (
                  <Link
                    to={`/${slug}/forgot-password`}
                    className={cn("text-xs font-medium transition-colors", "text-blue-200 hover:text-white hover:underline")}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={cn(
                    "h-12 rounded-2xl transition-all duration-300 pr-10",
                    !slug
                      ? "bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500/20"
                      : "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-primary/50"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 transition-colors",
                    !slug ? "text-gray-400 hover:text-gray-600" : "text-white/50 hover:text-white/80"
                  )}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full h-12 mt-8 text-base font-semibold rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border-0",
                !slug
                  ? "bg-[#2563eb] text-white shadow-blue-500/20"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              )}
              disabled={loading}
              style={!slug ? { backgroundColor: '#2563eb', color: 'white', opacity: loading ? 0.7 : 1 } : {}}
            >
              {loading ? (
                <div className="flex items-center gap-2 text-white">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="text-white">Iniciando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <LogIn className="w-5 h-5 shrink-0 text-white fill-none" />
                  <span className="text-white">Iniciar Sesión</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>

        {slug && (
          <CardFooter className="flex flex-col space-y-4 pb-10 px-8">
            <div className="w-full flex items-center justify-center gap-4 py-2">
              <div className={cn("h-px flex-1", !slug ? "bg-gray-100" : "bg-white/20")}></div>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", !slug ? "text-gray-400" : "text-white/40")}>o</span>
              <div className={cn("h-px flex-1", !slug ? "bg-gray-100" : "bg-white/20")}></div>
            </div>

            {organization && !organization.requires_auth && organization.guest_user_id && (
              <Button
                type="button"
                variant="outline"
                onClick={handleGuestLogin}
                className="w-full h-12 text-base font-semibold rounded-2xl bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all duration-300"
                disabled={loading}
              >
                Continuar como Invitado
              </Button>
            )}

            <div className={cn("text-sm text-center", !slug ? "text-gray-500" : "text-blue-100/80")}>
              ¿No tienes una cuenta?{' '}
              <Link to={slug ? `/${slug}/register` : "/register"} className={cn("font-bold hover:underline decoration-2 underline-offset-4 transition-all", !slug ? "text-indigo-600 decoration-indigo-500/50" : "text-white decoration-primary/50")}>
                Regístrate ahora
              </Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
