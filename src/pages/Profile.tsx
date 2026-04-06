import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Loader2
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi Perfil</h1>
        <p className="text-gray-500 text-sm">Gestiona tu información personal y de contacto.</p>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="h-24 bg-gray-50 flex items-center justify-center border-b border-gray-100">
          <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary">
            <User className="w-8 h-8" />
          </div>
        </div>

        <CardHeader className="pt-4 text-center pb-2">
          <CardTitle className="text-xl font-bold text-gray-900">{profile.full_name}</CardTitle>
          <CardDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-10 font-bold"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Guardar Cambios
              </Button>
            </div>
          </form>

          {/* Cambio de Contraseña */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Seguridad</h3>
              <p className="text-[10px] text-gray-500">Actualiza tu contraseña para mantener tu cuenta segura.</p>
            </div>

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
                className="w-full h-10 font-bold border-gray-200 text-gray-700 hover:bg-gray-50"
                disabled={passwordLoading}
              >
                {passwordLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Actualizar Contraseña
              </Button>
            </form>
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
