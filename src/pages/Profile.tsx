import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Loader2,
  Lock,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { profile, fetchProfile, terminology, businessType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    apartment: ''
  });
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        apartment: profile.apartment || ''
      });
      fetchOrgName();
    }
  }, [profile]);

  const fetchOrgName = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();
    if (data) setOrganizationName(data.name);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setProfileMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        ...formData,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .eq('organization_id', profile.organization_id);

    if (error) {
      setProfileMessage({ type: 'error', text: 'Error al actualizar el perfil: ' + error.message });
    } else {
      await fetchProfile();
      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: passwordFormData.newPassword
    });

    if (error) {
      setPasswordMessage({ type: 'error', text: 'Error al cambiar la contraseña: ' + error.message });
    } else {
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setPasswordFormData({ newPassword: '', confirmPassword: '' });
    }
    setPasswordLoading(false);
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
      <div className="flex flex-col items-center text-center mt-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mi Perfil</h1>
        <p className="text-gray-500 text-sm font-medium mt-1">Gestiona tu información personal y cuenta.</p>
      </div>

      <Card className="border-none apple-shadow rounded-2xl bg-white overflow-hidden mt-8 transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1">
        <div className="h-32 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center border-b border-gray-50 relative">
          <div className="absolute -bottom-8 w-20 h-20 rounded-2xl bg-white apple-shadow flex items-center justify-center text-primary border border-gray-50 z-10 transition-transform hover:scale-105 duration-300">
            <User className="w-10 h-10" />
          </div>
        </div>

        <CardHeader className="pt-12 text-center pb-4">
          <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">{profile.full_name}</CardTitle>
          <CardDescription className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            {terminology.userLabel} {businessType === 'residential' && `de ${profile.apartment || 'N/A'}`} • {organizationName || 'Cargando...'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {profileMessage && (
            <div className={cn(
              "p-3 rounded-lg text-xs font-bold flex items-center gap-2 border",
              profileMessage.type === 'success' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
            )}>
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Nombre Completo</Label>
              <Input
                className="h-10 rounded-lg text-sm"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Correo Electrónico</Label>
                <Input
                  className="h-10 rounded-lg text-sm bg-gray-50 text-gray-400 border-gray-100"
                  value={profile.email}
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Teléfono</Label>
                <Input
                  className="h-10 rounded-lg text-sm"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="300 123 4567"
                />
              </div>
            </div>

            {businessType === 'residential' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400">{terminology.unitLabel}</Label>
                <Input
                  className="h-10 rounded-lg text-sm"
                  value={formData.apartment}
                  onChange={e => setFormData({ ...formData, apartment: e.target.value })}
                  placeholder={terminology.unitPlaceholder}
                />
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full font-black shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Guardar Cambios
              </Button>
            </div>
          </form>

          {/* Cambio de Contraseña */}
          <div className="pt-6 border-t border-gray-100">
            <div 
              className="flex items-center justify-between cursor-pointer group p-2 rounded-xl hover:bg-gray-50 transition-colors"
              onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">Seguridad</h3>
                  <p className="text-[10px] text-gray-500">Actualiza tu contraseña para mantener tu cuenta segura.</p>
                </div>
              </div>
              <div className={cn(
                "text-gray-400 transition-transform duration-500",
                isPasswordSectionOpen ? "rotate-180 text-primary" : "rotate-0 group-hover:text-primary"
              )}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>

            <div 
              className={cn(
                "grid transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                isPasswordSectionOpen ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-4 pb-2">
                  {passwordMessage && (
                    <div className={cn(
                      "p-3 rounded-lg text-xs font-bold flex items-center gap-2 border",
                      passwordMessage.type === 'success' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Nueva Contraseña</Label>
                        <Input
                          type="password"
                          className="h-10 rounded-lg text-sm"
                          value={passwordFormData.newPassword}
                          onChange={e => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                          required
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Confirmar Contraseña</Label>
                        <Input
                          type="password"
                          className="h-10 rounded-lg text-sm"
                          value={passwordFormData.confirmPassword}
                          onChange={e => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                          required
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full font-bold border-gray-200 text-gray-700 hover:bg-gray-50 mt-2"
                      disabled={passwordLoading}
                    >
                      {passwordLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Actualizar Contraseña
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-gray-50/50 p-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium text-center w-full">
            Tus datos están protegidos. Para cambiar de rol, contacta a la administración.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
