import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HabeasData } from '@/components/ui/habeas-data';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { LogIn, UserPlus, X, Building2 } from 'lucide-react';
import { translateAuthError } from '@/lib/utils';
import { useOrganizationImages } from '@/hooks/useOrganizationImages';
import { useParams } from 'react-router-dom';

export function AuthModal() {
  const { authModal, closeAuthModal, terminology, profile } = useAuth();
  const { slug } = useParams();
  const { isOpen, view: initialView } = authModal;
  
  const [view, setView] = useState<'login' | 'register'>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [apartment, setApartment] = useState('');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccessAlertOpen, setIsSuccessAlertOpen] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const { cachedImages } = useOrganizationImages(slug);

  useEffect(() => {
    if (isOpen) {
      setView(authModal.view);
      setError(null);
      // Intentar cargar la organización si hay slug
      if (slug) fetchOrganization();
    }
  }, [isOpen, authModal.view, slug]);

  const fetchOrganization = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();
    if (data) setOrganization(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeAuthModal();
    } catch (err: any) {
      setError(translateAuthError(err.message || 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habeasDataAccepted) {
      setError('Debe aceptar el tratamiento de datos personales');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            phone: phone,
            apartment: apartment,
            organization_id: organization?.id,
            habeas_data_accepted: true,
            habeas_data_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      setIsSuccessAlertOpen(true);
    } catch (err: any) {
      setError(translateAuthError(err.message) || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && !profile.is_guest && isOpen) {
      closeAuthModal();
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={closeAuthModal} />
      
      <Card className="relative z-10 w-full max-w-lg max-h-[95vh] overflow-y-auto border-white/20 bg-gray-900/40 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] animate-in zoom-in-95 duration-300 custom-scrollbar">
        {/* Organization Background Image with Overlay */}
        {(organization?.login_photo_url || cachedImages?.login_photo_url) && (
          <div className="absolute inset-0 z-0">
            <img 
              src={organization?.login_photo_url || cachedImages?.login_photo_url} 
              alt="" 
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90" />
          </div>
        )}

        <button 
          onClick={closeAuthModal}
          className="absolute right-6 top-6 p-2 rounded-full hover:bg-black/5 text-gray-400 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader className="relative z-10 text-center pt-8 pb-4">
          <div className="flex justify-center mb-4">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Building2 className="w-10 h-10 text-white/80" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl font-bold text-white drop-shadow-sm">
            {view === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </CardTitle>
          <CardDescription className="text-blue-100 font-medium">
            {view === 'login' 
              ? `Ingresa tus credenciales para administrar tus ${terminology.reservationLabel.toLowerCase()}s.` 
              : `Regístrate en ${organization?.name || 'la plataforma'} para continuar.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 px-8 pb-4">
          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {view === 'register' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="modal-name" className="text-white font-medium ml-1">Nombre Completo</Label>
                  <Input 
                    id="modal-name" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="Juan Pérez" 
                    required 
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modal-phone" className="text-white font-medium ml-1">Teléfono</Label>
                    <Input 
                      id="modal-phone" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="300 123 4567" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-apt" className="text-white font-medium ml-1">{terminology.unitLabel}</Label>
                    <Input 
                      id="modal-apt" 
                      value={apartment} 
                      onChange={e => setApartment(e.target.value)} 
                      placeholder="101" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 animate-in fade-in duration-300">
              <Label htmlFor="modal-email" className="text-white font-medium ml-1">Correo Electrónico</Label>
              <Input 
                id="modal-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="tu@correo.com" 
                required 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2 animate-in fade-in duration-300">
              <Label htmlFor="modal-pass" className="text-white font-medium ml-1">Contraseña</Label>
              <Input 
                id="modal-pass" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-xl focus:ring-primary/50"
              />
            </div>

            {view === 'register' && (
              <div className="pt-2 animate-in fade-in duration-500">
                <HabeasData accepted={habeasDataAccepted} onAccept={setHabeasDataAccepted} />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 mt-4 font-bold rounded-2xl shadow-lg bg-primary hover:bg-primary/90 text-white transition-all transform hover:scale-[1.01]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Procesando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {view === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {view === 'login' ? 'Iniciar Sesión' : 'Registrarme ahora'}
                </div>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="relative z-10 flex flex-col items-center gap-4 pb-8 pt-2">
          <div className="flex items-center gap-2 text-sm text-blue-100/60">
            {view === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button 
              onClick={() => setView(view === 'login' ? 'register' : 'login')}
              className="font-bold text-white hover:text-primary transition-colors underline decoration-primary/50 underline-offset-4"
            >
              {view === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog
        open={isSuccessAlertOpen}
        onOpenChange={(open) => {
          setIsSuccessAlertOpen(open);
          if (!open) {
            closeAuthModal();
          }
        }}
        title="¡Registro Exitoso!"
        description="Tu cuenta ha sido creada. Verifica tu correo para activar tu perfil. Como eres invitado, ya puedes continuar usando el sistema."
        confirmText="Entendido"
        showCancel={false}
        onConfirm={closeAuthModal}
      />
    </div>
  );
}
