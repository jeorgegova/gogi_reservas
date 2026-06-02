import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Info,
  AlertTriangle,
  Calendar,
  Plus,
  Trash2,
  MapPin,
  Clock,
  X,
  Wrench,
  Edit,
  HelpCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import { AlertDialog } from '@/components/ui/alert-dialog';

interface Notice {
  id: string;
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  starts_at: string;
  ends_at: string;
  resource_id: string | null;
  resources?: {
    name: string;
  };
  is_active: boolean;
  created_at: string;
}

export default function MaintenancePage() {
  const { profile, terminology } = useAuth();
  const navigate = useNavigate();
  const { status: subscriptionStatus, daysUntilExpiry, loading: subscriptionLoading, previousSubscriptionExpiredBeyond20Days } = useSubscriptionStatus(profile?.organization_id);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const editNoticeId = searchParams.get('edit');
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    severity: 'info',
    starts_at: '',
    ends_at: '',
    resource_id: '',
    mode: 'range' as 'range' | 'day',
    single_date: '',
  });
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
  useEffect(() => {
    if (!subscriptionLoading) {
      if (subscriptionStatus === 'cancelled') {
        setBlockingError('Tu suscripción ha sido cancelada. Contacta al administrador para reactivar tu cuenta.');
      } else if (subscriptionStatus === 'inactive' || (subscriptionStatus === 'past_due' && daysUntilExpiry !== undefined && daysUntilExpiry < -20) || (subscriptionStatus === 'past_due' && previousSubscriptionExpiredBeyond20Days)) {
        setBlockingError('Servicio temporalmente inhabilitado. Si tienes dudas por favor comunícate con administración.');
      } else {
        setBlockingError(null);
      }
    }
  }, [subscriptionStatus, daysUntilExpiry, subscriptionLoading, previousSubscriptionExpiredBeyond20Days]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchNotices();
      fetchAreas();
    }
  }, [profile?.organization_id]);

  // Cargar mantenimiento a editar cuando hay parámetro de query
  useEffect(() => {
    if (editNoticeId && isAdmin) {
      const noticeToEdit = notices.find(n => n.id === editNoticeId);
      if (noticeToEdit) {
        setEditingNotice(noticeToEdit);
        setIsAdding(true);
      } else {
        // Si no se encuentra en el estado, buscar en la base de datos
        fetchNoticeToEdit(editNoticeId);
      }
    }
  }, [editNoticeId, notices, isAdmin]);

  const fetchNoticeToEdit = async (id: string) => {
    const { data, error } = await supabase
      .from('maintenance_notices')
      .select(`*, resources (name)`)
      .eq('id', id)
      .eq('organization_id', profile?.organization_id)
      .single();

    if (data && !error) {
      setEditingNotice(data);
      setIsAdding(true);
    }
  };

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_notices')
        .select(`
          *,
          resources (name)
        `)
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false })
        .order('is_active', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching maintenance notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('resources')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true);
    setAreas(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let startsAt = newNotice.starts_at;
    let endsAt = newNotice.ends_at;

    if (newNotice.mode === 'day' && newNotice.single_date) {
      startsAt = `${newNotice.single_date}T00:00`;
      endsAt = `${newNotice.single_date}T23:59`;
    }

    if (startsAt) {
      const startDate = new Date(startsAt);
      const now = new Date();
      if (startDate < now && !editingNotice) {
        alert('No se puede seleccionar una fecha y hora anterior a ahora.');
        setIsSubmitting(false);
        return;
      }
    }

    if (startsAt && endsAt) {
      const startDate = new Date(startsAt);
      const endDate = new Date(endsAt);
      if (endDate <= startDate) {
        alert('La fecha de fin debe ser posterior a la fecha de inicio.');
        setIsSubmitting(false);
        return;
      }
    }

    if (startsAt && endsAt && profile?.organization_id) {
      const { data: conflicts } = await supabase
        .from('reservations')
        .select('id, start_datetime, end_datetime, profiles:user_id(full_name), resources(name)')
        .eq('organization_id', profile.organization_id)
        .in('status', ['approved', 'pending_validation', 'pending_payment'])
        .lt('start_datetime', endsAt.includes('T') ? endsAt : endsAt + 'T23:59:59')
        .gt('end_datetime', startsAt.includes('T') ? startsAt : startsAt + 'T00:00:00');

      if (conflicts && conflicts.length > 0) {
        const conflictList = conflicts.map((c: any) =>
          `- ${c.profiles?.full_name || 'Usuario'} en ${c.resources?.name || 'Área'} (${new Date(c.start_datetime).toLocaleString('es')} → ${new Date(c.end_datetime).toLocaleString('es')})`
        ).join('\n');
        const proceed = confirm(
          `⚠️ Se encontraron ${conflicts.length} ${conflicts.length === 1 ? 'reserva' : 'reservas'} en el rango del aviso:\n\n${conflictList}\n\n¿Deseas continuar publicando el aviso de todas formas?`
        );
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (editingNotice) {
      const { error } = await supabase
        .from('maintenance_notices')
        .update({
          title: newNotice.title,
          content: newNotice.content,
          severity: newNotice.severity,
          starts_at: startsAt,
          ends_at: endsAt,
          resource_id: newNotice.resource_id || null
        })
        .eq('id', editingNotice.id);

      if (!error) {
        setIsAdding(false);
        setEditingNotice(null);
        fetchNotices();
        setSearchParams({});
        setNewNotice({
          title: '',
          content: '',
          severity: 'info',
          starts_at: '',
          ends_at: '',
          resource_id: '',
          mode: 'range',
          single_date: '',
        });
      } else {
        console.error('Error updating notice:', error);
      }
    } else {
      const { error } = await supabase.from('maintenance_notices').insert({
        title: newNotice.title,
        content: newNotice.content,
        severity: newNotice.severity,
        starts_at: startsAt,
        ends_at: endsAt,
        resource_id: newNotice.resource_id || null,
        organization_id: profile?.organization_id
      });
      if (!error) {
        setIsAdding(false);
        fetchNotices();
        setNewNotice({
          title: '',
          content: '',
          severity: 'info',
          starts_at: '',
          ends_at: '',
          resource_id: '',
          mode: 'range',
          single_date: '',
        });
      } else {
        console.error('Error creating notice:', error);
      }
    }
    setIsSubmitting(false);
  };

  // Inicializar formulario cuando se entra en modo edición
  useEffect(() => {
    if (editingNotice) {
      setNewNotice({
        title: editingNotice.title || '',
        content: editingNotice.content || '',
        severity: editingNotice.severity || 'info',
        starts_at: editingNotice.starts_at ? editingNotice.starts_at.slice(0, 16) : '',
        ends_at: editingNotice.ends_at ? editingNotice.ends_at.slice(0, 16) : '',
        resource_id: editingNotice.resource_id || '',
        mode: 'range',
        single_date: '',
      });
    }
  }, [editingNotice]);

  const handleCloseForm = () => {
    setIsAdding(false);
    setEditingNotice(null);
    setSearchParams({});
    setNewNotice({
      title: '',
      content: '',
      severity: 'info',
      starts_at: '',
      ends_at: '',
      resource_id: '',
      mode: 'range',
      single_date: '',
    });
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-100',
          icon: 'bg-red-100 text-red-600',
          badge: 'bg-red-100 text-red-700',
          text: 'text-red-800'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-100',
          icon: 'bg-amber-100 text-amber-600',
          badge: 'bg-amber-100 text-amber-700',
          text: 'text-amber-800'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          icon: 'bg-blue-100 text-blue-600',
          badge: 'bg-blue-100 text-blue-700',
          text: 'text-blue-800'
        };
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'Crítico';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Informativo';
    }
  };

  const handleDeleteClick = (id: string) => {
    setNoticeToDelete(id);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noticeToDelete || !profile?.organization_id) return;
    await supabase.from('maintenance_notices')
      .delete()
      .eq('id', noticeToDelete)
      .eq('organization_id', profile.organization_id);
    fetchNotices();
    setIsDeleteAlertOpen(false);
    setNoticeToDelete(null);
  };

  const toggleNoticeActive = async (noticeId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('maintenance_notices')
        .update({ is_active: !currentActive })
        .eq('id', noticeId)
        .eq('organization_id', profile?.organization_id);

      if (error) throw error;

      // Update local state
      setNotices(notices.map(notice =>
        notice.id === noticeId ? { ...notice, is_active: !currentActive } : notice
      ));
    } catch (error) {
      console.error('Error toggling notice active status:', error);
    }
  };

  if (blockingError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-none shadow-sm bg-white text-center p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <HelpCircle className="w-12 h-12" />
            </div>
          </div>
          <CardHeader className="p-0">
            <h2 className="text-xl mb-4 font-bold text-gray-900 tracking-tight">¡Oops! Servicio temporalmente inhabilitado</h2>
          </CardHeader>
          <p className="text-gray-500 text-sm mb-6">
            {blockingError}
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full bg-primary hover:bg-primary/95 shadow-lg shadow-primary/25 h-11 px-6 rounded-xl transition-all duration-200">
            Regresar al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{terminology.noticesLabel}</h1>
          </div>
          <p className="text-gray-500 text-sm ml-1">
            {isAdmin
              ? `Informa a los ${terminology.userLabel.toLowerCase()}s sobre cierres o novedades.`
              : `Mantente informado sobre las novedades de los ${terminology.areaLabel.toLowerCase()}s.`}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsAdding(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 px-5 rounded-xl shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Aviso
          </Button>
        )}
      </div>

      {/* Form Section */}
      {isAdmin && isAdding && (
        <Card className="border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  {editingNotice ? 'Editar Comunicado' : 'Nuevo Comunicado'}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {editingNotice ? 'Modifica los datos del comunicado' : `Publica una noticia para todos los ${terminology.userLabel.toLowerCase()}s`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseForm}
                className="h-8 w-8 rounded-full hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Título del aviso
                  </Label>
                  <Input
                    id="title"
                    value={newNotice.title}
                    onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                    required
                    placeholder={terminology.noticesPlaceholder}
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area" className="text-sm font-medium text-gray-700">
                    {terminology.areaLabel} Afectada
                  </Label>
                  <select
                    id="area"
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                    value={newNotice.resource_id}
                    onChange={e => setNewNotice({ ...newNotice, resource_id: e.target.value })}
                    required
                  >
                    <option value="">Selecciona un {terminology.areaLabel.toLowerCase()}...</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity" className="text-sm font-medium text-gray-700">
                  Nivel de severidad
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {['info', 'warning', 'critical'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setNewNotice({ ...newNotice, severity: sev })}
                      className={`
                        h-11 px-4 rounded-lg border-2 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
                        ${newNotice.severity === sev
                          ? getSeverityStyles(sev).border + ' ' + getSeverityStyles(sev).bg
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {sev === 'critical' && <AlertTriangle className="h-4 w-4" />}
                      {sev === 'warning' && <AlertTriangle className="h-4 w-4" />}
                      {sev === 'info' && <Info className="h-4 w-4" />}
                      {getSeverityLabel(sev)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium text-gray-700">
                  Descripción del aviso
                </Label>
                <textarea
                  id="content"
                  className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 resize-none"
                  value={newNotice.content}
                  onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                  required
                  placeholder="Describe los detalles del aviso aquí..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tipo de selección</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewNotice({ ...newNotice, mode: 'range' })}
                    className={`h-10 px-4 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      newNotice.mode === 'range'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    Rango (Desde - Hasta)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewNotice({ ...newNotice, mode: 'day' })}
                    className={`h-10 px-4 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      newNotice.mode === 'day'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Día completo
                  </button>
                </div>
              </div>

              {newNotice.mode === 'day' ? (
                <div className="space-y-2">
                  <Label htmlFor="singleDate" className="text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Fecha del aviso
                  </Label>
                  <Input
                    id="singleDate"
                    type="date"
                    value={newNotice.single_date}
                    onChange={e => setNewNotice({ ...newNotice, single_date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="startsAt" className="text-sm font-medium text-gray-700">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Fecha y hora de inicio
                  </Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={newNotice.starts_at}
                    onChange={e => {
                      const val = e.target.value;
                      setNewNotice({ ...newNotice, starts_at: val });
                    }}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endsAt" className="text-sm font-medium text-gray-700">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Fecha y hora de fin
                  </Label>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={newNotice.ends_at}
                    min={newNotice.starts_at || undefined}
                    onChange={e => setNewNotice({ ...newNotice, ends_at: e.target.value })}
                    required
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>
              </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                  className="h-11 px-5 font-medium rounded-xl border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-6 font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-primary-foreground transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {editingNotice ? 'Guardando...' : 'Publicando...'}
                    </>
                  ) : (
                    <>
                      {editingNotice ? (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Guardar Cambios
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Publicar Aviso
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notices Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 px-1">
          {notices.length > 0 ? `(${notices.length}) Avisos Recientes` : 'Avisos Recientes'}
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600" />
              <p className="text-sm text-gray-500">Cargando datos...</p>
            </div>
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Info className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay avisos publicados</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {isAdmin
                ? `Crea el primer aviso para informar a los ${terminology.userLabel.toLowerCase()}s sobre novedades o cierres.`
                : `No hay avisos activos en este momento.`}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setIsAdding(true)}
                className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-10 px-5 rounded-xl shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="mr-2 h-4 w-4" /> Crear Primer Aviso
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notices.map((notice) => {
              const styles = getSeverityStyles(notice.severity);
              return (
                <Card
                  key={notice.id}
                  className={`group border-none shadow-sm hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden ${notice.is_active === false ? 'opacity-60' : ''}`}
                >
                  {/* Severity Indicator Bar */}
                  <div className={`h-1.5 w-full ${notice.severity === 'critical' ? 'bg-red-500' : notice.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />

                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2.5 rounded-xl ${styles.icon} transition-transform duration-200 group-hover:scale-110`}>
                          {notice.severity === 'critical' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : notice.severity === 'warning' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Info className="w-4 h-4" />
                          )}
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                            {notice.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {notice.resources && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                                <MapPin className="h-3 w-3" />
                                {notice.resources.name}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${styles.badge}`}>
                              {getSeverityLabel(notice.severity)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSearchParams({ edit: notice.id })}
                              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 text-blue-500 hover:text-blue-600" />
                            </Button>
                            <Switch
                              checked={notice.is_active ?? true}
                              onCheckedChange={() => toggleNoticeActive(notice.id, notice.is_active ?? true)}
                              className="mx-auto"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(notice.id)}
                              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">
                      {notice.content}
                    </p>
                    {notice.starts_at && (
                      <div className={`flex items-center gap-2 text-xs ${styles.text} bg-gray-50 rounded-lg px-3 py-2`}>
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          {formatDate(notice.starts_at)}
                          {notice.ends_at && <span className="mx-1.5">→</span>}
                          {notice.ends_at && formatDate(notice.ends_at)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        title="Eliminar Aviso"
        description="¿Estás seguro de que deseas eliminar este aviso? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="No, mantener"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
