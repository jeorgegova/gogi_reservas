import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Settings, Users, Loader2, Save, CheckCircle2, UserCheck, CreditCard, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ScheduleEntry {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function AdminSettingsPage() {
  const { profile, terminology } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(true);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [loginPhotoUrl, setLoginPhotoUrl] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [autoApprovePayments, setAutoApprovePayments] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchSettings();
      fetchSchedules();
    }
  }, [profile]);

  const fetchSchedules = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('operation_schedules')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('day_of_week');

    if (data && data.length > 0) {
      setSchedules(data);
    } else {
      setSchedules(DAY_NAMES.map((_, i) => ({
        day_of_week: i,
        start_time: '09:00',
        end_time: '18:00',
        is_active: i >= 1 && i <= 5,
      })));
    }
  };

  const handleScheduleChange = (dayOfWeek: number, field: keyof ScheduleEntry, value: any) => {
    setSchedules(prev => prev.map(s =>
      s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
    ));
  };

  const saveSchedules = async () => {
    if (!profile?.organization_id) return;
    const rows = schedules.map(s => ({
      ...(s.id ? { id: s.id } : {}),
      organization_id: profile.organization_id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      is_active: s.is_active,
    }));
    const { error } = await supabase
      .from('operation_schedules')
      .upsert(rows, { onConflict: 'organization_id,day_of_week' });
    if (error) throw error;
    await fetchSchedules();
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('requires_auth, guest_user_id, logo_url, login_photo_url, name, phone, address, auto_approve_payments')
        .eq('id', profile?.organization_id)
        .single();

      if (error) throw error;
      if (data) {
        setRequiresAuth(data.requires_auth ?? true);
        setGuestUserId(data.guest_user_id);
        setLogoUrl(data.logo_url || '');
        setLoginPhotoUrl(data.login_photo_url || '');
        setOrgName(data.name || '');
        setOrgPhone(data.phone || '');
        setOrgAddress(data.address || '');
        setAutoApprovePayments(data.auto_approve_payments ?? false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAuth = async (checked: boolean) => {
    setRequiresAuth(!checked);
  };

  const handleSave = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      let finalGuestId = guestUserId;

      if (!requiresAuth) {
        const { data: newGuestId, error: rpcError } = await supabase.rpc('setup_guest_user', {
          org_id: profile.organization_id,
          org_slug: profile.organization_slug
        });

        if (rpcError) throw rpcError;
        finalGuestId = newGuestId;
        setGuestUserId(newGuestId);
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          requires_auth: requiresAuth,
          guest_user_id: finalGuestId,
          logo_url: logoUrl,
          login_photo_url: loginPhotoUrl,
          name: orgName,
          phone: orgPhone,
          address: orgAddress,
          auto_approve_payments: autoApprovePayments,
        })
        .eq('id', profile.organization_id);

      if (error) throw error;
      await saveSchedules();
      toast.success('Configuración guardada exitosamente');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm">Personaliza el comportamiento general de la plataforma.</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Acceso Público */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg">Acceso y Registro</CardTitle>
            </div>
            <CardDescription>
              Configura cómo los usuarios pueden ingresar al portal de {terminology.reservationLabel.toLowerCase()}s.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-gray-900">Permitir {terminology.reservationLabel.toLowerCase()}s sin registro</Label>
                <p className="text-xs text-gray-500 max-w-md">
                  Si activas esta opción, cualquier persona con el link de tu organización podrá ver el calendario y realizar {terminology.reservationLabel.toLowerCase()}s sin necesidad de crear una cuenta.
                </p>
              </div>
              <Switch
                checked={!requiresAuth}
                onCheckedChange={handleToggleAuth}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <UserCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">¿Cómo funciona?</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                  <li>Las {terminology.reservationLabel.toLowerCase()}s anónimas se vincularán automáticamente a un perfil de "Invitado".</li>
                  <li>Los invitados podrán ver el calendario de disponibilidad completa.</li>
                  <li>Al finalizar una {terminology.reservationLabel.toLowerCase()}, el sistema les sugerirá registrarse para obtener beneficios.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de la Organización */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg">Perfil de la Organización</CardTitle>
            </div>
            <CardDescription>
              Actualiza la información de contacto y nombre de tu organización.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-sm font-bold text-gray-700">Nombre de la Organización</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Nombre de tu empresa"
                className="h-10 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orgPhone" className="text-sm font-bold text-gray-700">Teléfono de Contacto</Label>
                <Input
                  id="orgPhone"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgAddress" className="text-sm font-bold text-gray-700">Dirección Física</Label>
                <Input
                  id="orgAddress"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  placeholder="Calle 123 #45-67"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagos */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg">Configuración de Pagos</CardTitle>
            </div>
            <CardDescription>
              Configura el comportamiento de los pagos con Wompi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-gray-900">Auto-aprobar reservas pagadas</Label>
                <p className="text-xs text-gray-500 max-w-md">
                  Si activas esta opción, las reservas se aprobarán automáticamente al confirmarse el pago. Si la desactivas, quedarán en estado "pendiente de validación" para que un administrador las revise.
                </p>
              </div>
              <Switch
                checked={autoApprovePayments}
                onCheckedChange={setAutoApprovePayments}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
            <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Proveedor de pagos</h4>
                <p className="text-xs text-blue-800">
                  Los pagos se procesan a través de Wompi. Los fondos se reciben directamente en tu cuenta bancaria registrada en Wompi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identidad Visual */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg">Identidad Visual</CardTitle>
            </div>
            <CardDescription>
              Personaliza el logo y las imágenes de fondo de tu portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700">Logo de la Organización (URL)</Label>
                <div className="flex flex-col gap-3">
                  <Input
                    value={logoUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                    className="h-10 rounded-xl"
                  />
                  {logoUrl && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex justify-center">
                      <img src={logoUrl} alt="Preview Logo" className="h-16 w-auto object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700">Fondo de Inicio de Sesión (URL)</Label>
                <div className="flex flex-col gap-3">
                  <Input
                    value={loginPhotoUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginPhotoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/fondo.jpg"
                    className="h-10 rounded-xl"
                  />
                  {loginPhotoUrl && (
                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden">
                      <img src={loginPhotoUrl} alt="Preview Background" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horario de Operación */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg">Horario de Operación</CardTitle>
            </div>
            <CardDescription>
              Define los días y horarios en que tu organización atiende. El motor de reservas usará esta configuración para mostrar disponibilidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {schedules.map(schedule => (
              <div
                key={schedule.day_of_week}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-xl border transition-all",
                  schedule.is_active ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100 opacity-50"
                )}
              >
                <Switch
                  checked={schedule.is_active}
                  onCheckedChange={(checked) => handleScheduleChange(schedule.day_of_week, 'is_active', checked)}
                  className="data-[state=checked]:bg-green-500"
                />
                <span className={cn(
                  "w-10 text-xs font-bold",
                  schedule.is_active ? "text-gray-900" : "text-gray-400"
                )}>
                  {DAY_SHORT[schedule.day_of_week]}
                </span>
                {schedule.is_active ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={schedule.start_time}
                      onChange={e => handleScheduleChange(schedule.day_of_week, 'start_time', e.target.value)}
                      className="h-8 rounded-lg text-xs w-28"
                    />
                    <span className="text-gray-400 text-xs">a</span>
                    <Input
                      type="time"
                      value={schedule.end_time}
                      onChange={e => handleScheduleChange(schedule.day_of_week, 'end_time', e.target.value)}
                      className="h-8 rounded-lg text-xs w-28"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 flex-1">No laborable</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Guest Profile Status (informational) */}
        {!requiresAuth && guestUserId && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Perfil de invitado configurado y activo.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto h-11 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
