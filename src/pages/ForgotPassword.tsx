import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrganizationImages } from '@/hooks/useOrganizationImages';
import { translateAuthError } from '@/lib/utils';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, CheckCircle2, Building2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { slug } = useParams();
  const [organization, setOrganization] = useState<any>(null);
  const { cachedImages, cacheImages } = useOrganizationImages(slug);

  useEffect(() => {
    if (slug) {
      fetchOrganization();
    }
  }, [slug]);

  const fetchOrganization = async () => {
    // Allow organizations with active or pending_validation subscription status
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .in('subscription_status', ['active', 'pending_validation'])
      .single();
    if (data) {
      setOrganization(data);
      cacheImages(data.logo_url, data.login_photo_url);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!slug) throw new Error("Organización no válida");

      // El correo redireccionará a verify-email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${slug}/verify-email`,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setError(translateAuthError(err.message || "Error al enviar el correo"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000"
          style={{
            backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none',
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>

        <Card className="relative z-10 w-full max-w-md border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
          <CardHeader className="text-center space-y-4 pt-10 pb-6">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative p-4 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-inner text-white">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white drop-shadow-md">Correo enviado</CardTitle>
            <CardDescription className="text-blue-100/90 text-base font-medium">
              Hemos enviado un enlace de recuperación a:
              <br />
              <span className="font-bold text-white mt-1 block">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-blue-100/70 text-sm px-8">
            Si no recibes el correo en unos minutos, revisa tu carpeta de spam o solicita un nuevo enlace.
          </CardContent>
          <CardFooter className="pb-10 pt-6 px-8">
            <Button asChild variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white rounded-2xl h-11 transition-all border border-white/20">
              <Link to={slug ? `/${slug}/login` : "/"} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={slug ? `Recuperar Contraseña - ${organization?.name || 'Portal'}` : 'Recuperar Contraseña'}
        description="Recupera el acceso a tu cuenta de GoGi Reservas."
        pathname={slug ? `/${slug}/forgot-password` : '/forgot-password'}
        noindex
      />
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat animate-slow-zoom"
        style={{
          backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <Card className="relative z-10 w-full max-w-md border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center pt-10 pb-8">
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
          <CardTitle className="text-3xl font-bold tracking-tight text-white drop-shadow-md text-center pb-2">Recuperar contraseña</CardTitle>
          <CardDescription className="text-blue-100/90 text-base font-medium">
            Ingresa tu correo electrónico para recibir un enlace de recuperación
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          <form onSubmit={handleResetRequest} className="space-y-5">
            {error && (
              <div className="bg-destructive/20 text-white text-sm p-3 rounded-xl border border-destructive/30 backdrop-blur-md animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium ml-1">Correo electrónico</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-white/40 group-focus-within:text-white transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12 pl-10 rounded-2xl focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 mt-2 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enviando...
                </div>
              ) : (
                "Enviar enlace de recuperación"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pb-10 pt-6 px-8">
          <Button asChild variant="ghost" className="w-full text-blue-100/80 hover:bg-white/10 hover:text-white rounded-2xl h-11 transition-all">
            <Link to={slug ? `/${slug}/login` : "/"} className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}
