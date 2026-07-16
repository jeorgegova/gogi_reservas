import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { SEOHead } from '@/components/seo/SEOHead';
import { supabase } from '@/lib/supabase';
import { useOrganizationImages } from '@/hooks/useOrganizationImages';
import { translateAuthError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Building2, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { slug } = useParams();
  const navigate = useNavigate();

  // Verification states
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Password reset states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [successUpdate, setSuccessUpdate] = useState(false);

  const [organization, setOrganization] = useState<any>(null);
  const { cachedImages, cacheImages } = useOrganizationImages(slug);

  useEffect(() => {
    if (slug) fetchOrganization();

    // Process Token
    handleVerifyToken();
  }, [slug]);

  const fetchOrganization = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();
    if (data) {
      setOrganization(data);
      cacheImages(data.logo_url, data.login_photo_url);
    }
  };

  const handleVerifyToken = async () => {
    const tokenHash = searchParams.get('token_hash');
    const typeValue = searchParams.get('type');

    if (!tokenHash || !typeValue) {
      setError("Enlace de verificación inválido o incompleto.");
      setVerifying(false);
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: typeValue as any,
      });

      if (error) throw error;

      if (typeValue === 'recovery') {
        setIsRecovery(true);
      } else {
        setConfirmed(true);
      }
    } catch (err: any) {
      setError(translateAuthError(err.message || "Error al verificar el enlace"));
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setUpdating(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setUpdating(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccessUpdate(true);
      setTimeout(() => {
        navigate(`/${slug}/login`);
      }, 3000);
    } catch (err: any) {
      setError(translateAuthError(err.message || "Error al actualizar la contraseña"));
    } finally {
      setUpdating(false);
    }
  };

  // State: Loading / Verifying
  if (verifying) {
    return (
      <>
        <SEOHead
          title="Verificando correo electrónico"
          description="Verificamos tu correo electrónico para activar tu cuenta de GoGi Reservas."
          pathname={slug ? `/${slug}/verify-email` : '/verify-email'}
          noindex
        />
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h2 className="text-xl font-medium text-gray-600">Verificando tu cuenta...</h2>
          </div>
        </div>
      </>
    );
  }

  // State: Error
  if (error && !isRecovery) {
    return (
      <>
        <SEOHead
          title="Error de verificación"
          description="El enlace de verificación es inválido o ha expirado. Solicita un nuevo enlace en GoGi Reservas."
          pathname={slug ? `/${slug}/verify-email` : '/verify-email'}
          noindex
        />
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>
        <Card className="relative z-10 w-full max-w-md border-red-500/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2rem] text-center">
          <CardHeader className="pt-10 pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/20 rounded-full border border-red-500/30">
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">¡Error de verificación!</CardTitle>
            <CardDescription className="text-red-100/90 mt-2">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="pb-10 pt-4 px-8">
            <Button asChild variant="outline" className="w-full text-white border-white/20 hover:bg-white/10 rounded-2xl h-11">
              <Link to={slug ? `/${slug}/forgot-password` : "/"} className="flex items-center gap-2">
                Solicitar nuevo enlace
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      </>
    );
  }

  // State: Confirmed (Signup/Verification success)
  if (confirmed) {
    return (
      <>
        <SEOHead
          title="Verificación exitosa"
          description="Tu cuenta de GoGi Reservas ha sido verificada correctamente. Ahora puedes iniciar sesión."
          pathname={slug ? `/${slug}/verify-email` : '/verify-email'}
          noindex
        />
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>
        <Card className="relative z-10 w-full max-w-md border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] text-center">
          <CardHeader className="pt-10 pb-6">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full blur opacity-40"></div>
                <div className="relative p-4 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">¡Verificación Exitosa!</CardTitle>
            <CardDescription className="text-blue-100/90 text-base mt-2">
              Tu cuenta ha sido confirmada correctamente. Ahora puedes acceder a la plataforma.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pb-10 pt-6 px-8">
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 text-base font-semibold transition-all shadow-lg hover:shadow-primary/20">
              <Link to={`/${slug}/login`} className="flex items-center justify-center gap-2">
                Iniciar sesión ahora
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      </>
    );
  }

  // State: Recovery (Show password form)
  if (isRecovery) {
    if (successUpdate) {
      return (
        <>
          <SEOHead
            title="Contraseña actualizada"
            description="Tu contraseña de GoGi Reservas ha sido actualizada correctamente."
            pathname={slug ? `/${slug}/verify-email` : '/verify-email'}
            noindex
          />
          <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none' }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
          </div>
          <Card className="relative z-10 w-full max-w-md border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] text-center">
            <CardHeader className="pt-10 pb-6">
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-14 h-14 text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Contraseña actualizada</CardTitle>
              <CardDescription className="text-blue-100/90 mt-2">
                Tu contraseña ha sido cambiada con éxito. Redirigiendo al inicio de sesión...
              </CardDescription>
          </CardHeader>
        </Card>
      </div>
        </>
      );
    }

    return (
      <>
        <SEOHead
          title="Restablecer contraseña"
          description="Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta de GoGi Reservas."
          pathname={slug ? `/${slug}/verify-email` : '/verify-email'}
          noindex
        />
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: cachedImages.login_photo_url ? `url("${cachedImages.login_photo_url}")` : 'none' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>

        <Card className="relative z-10 w-full max-w-md border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem]">
          <CardHeader className="text-center pt-10 pb-8">
            <div className="flex justify-center mb-8">
              {organization?.logo_url || cachedImages.logo_url ? (
                <img src={organization?.logo_url || cachedImages.logo_url} className="w-48" alt="Logo" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Building2 className="h-14 w-14 text-white/80" />
                </div>
              )}
            </div>
            <CardTitle className="text-3xl font-bold text-white drop-shadow-md pb-2">Nueva contraseña</CardTitle>
            <CardDescription className="text-blue-100/90 text-base font-medium">Ingresa tu nueva contraseña para recuperar el acceso</CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {error && (
                <div className="bg-destructive/20 text-white text-sm p-3 rounded-xl border border-destructive/30 backdrop-blur-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white font-medium ml-1 text-sm">Nueva contraseña</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-white/40 group-focus-within:text-white transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white h-12 pl-10 rounded-2xl focus:ring-primary/50"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-white/40 hover:text-white">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white font-medium ml-1 text-sm">Confirmar contraseña</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-white/40" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white h-12 pl-10 rounded-2xl focus:ring-primary/50"
                  />
                </div>
              </div>

              <Button type="submit" disabled={updating} className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg transition-all active:scale-[0.98]">
                {updating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Actualizando...
                  </div>
                ) : "Actualizar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  return (
    <SEOHead
      title="Verificando correo electrónico"
      description="Verificamos tu correo electrónico para activar tu cuenta de GoGi Reservas."
      pathname={slug ? `/${slug}/verify-email` : '/verify-email'}
      noindex
    />
  );
}
