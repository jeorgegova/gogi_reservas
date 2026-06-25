import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Clock, Trash2, Package, Settings, Sparkles } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

function CurrencyInput({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  useEffect(() => {
    if (value) {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = rawValue ? parseInt(rawValue, 10) : 0;
    onChange(numValue);
    setDisplayValue(rawValue ? formatNumber(parseInt(rawValue, 10)) : '');
  };

  const handleFocus = () => {
    if (value) setDisplayValue(value.toString());
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <Input type="text" value={displayValue} onChange={handleChange} onFocus={handleFocus} className={cn("pl-6", className)} placeholder={placeholder || "0"} />
    </div>
  );
}

function DurationSelector({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const options = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hora', value: 60 },
    { label: '1h 15min', value: 75 },
    { label: '1h 30min', value: 90 },
    { label: '1h 45min', value: 105 },
    { label: '2 horas', value: 120 },
    { label: '2h 30min', value: 150 },
    { label: '3 horas', value: 180 },
  ];

  return (
    <select
      value={value || 30}
      onChange={e => onChange(parseInt(e.target.value))}
      className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 w-full"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export default function AdminServicesPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<any>({
    name: '',
    description: '',
    base_cost: 0,
    duration_minutes: 30,
    is_active: true,
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchServices();
    }
  }, [profile?.organization_id]);

  const fetchServices = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error('Error al cargar servicios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: any) => {
    setCurrentService(service);
    setIsEditing(true);
  };

  const handleStartNew = () => {
    setCurrentService({
      name: '',
      description: '',
      base_cost: 0,
      duration_minutes: 30,
      is_active: true,
    });
    setIsEditing(true);
  };

  const handleToggleActive = async (service: any) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)
        .eq('organization_id', profile?.organization_id);
      if (error) throw error;
      toast.success(`Servicio ${!service.is_active ? 'activado' : 'desactivado'}`);
      fetchServices();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) return;
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('organization_id', profile?.organization_id);
      if (error) throw error;
      toast.success('Servicio eliminado');
      fetchServices();
    } catch (error: any) {
      toast.error('Error al eliminar servicio: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = profile?.organization_id;
    if (!orgId) return;

    if (!currentService.name?.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }

    const payload = {
      name: currentService.name.trim(),
      description: currentService.description || null,
      base_cost: currentService.base_cost || 0,
      duration_minutes: currentService.duration_minutes || 30,
      is_active: currentService.is_active !== false,
      organization_id: orgId,
    };

    try {
      if (currentService.id) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', currentService.id)
          .eq('organization_id', orgId);
        if (error) throw error;
        toast.success('Servicio actualizado');
      } else {
        const { error } = await supabase
          .from('services')
          .insert(payload);
        if (error) throw error;
        toast.success('Servicio creado');
      }
      setIsEditing(false);
      fetchServices();
    } catch (error: any) {
      toast.error('Error al guardar servicio: ' + error.message);
    }
  };

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Servicios</h1>
            <p className="text-gray-500 text-xs md:text-sm">Configura los servicios que ofreces a tus clientes.</p>
          </div>
        </div>
        <Button
          onClick={handleStartNew}
          className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-10 md:h-12 px-4 md:px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none text-xs md:text-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Servicio
        </Button>
      </div>

      {isEditing && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-gray-50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {currentService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
            </h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Completa los detalles de este servicio</p>
          </div>
          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Nombre</Label>
                    <Input
                      value={currentService.name}
                      onChange={e => setCurrentService({ ...currentService, name: e.target.value })}
                      placeholder="Ej: Corte Clásico, Barba, Tinte..."
                      required
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Descripción</Label>
                    <Input
                      value={currentService.description || ''}
                      onChange={e => setCurrentService({ ...currentService, description: e.target.value })}
                      placeholder="Breve descripción del servicio"
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Precio Base</Label>
                    <CurrencyInput
                      value={currentService.base_cost}
                      onChange={val => setCurrentService({ ...currentService, base_cost: val })}
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Duración</Label>
                    <DurationSelector
                      value={currentService.duration_minutes}
                      onChange={val => setCurrentService({ ...currentService, duration_minutes: val })}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={currentService.is_active}
                      onCheckedChange={checked => setCurrentService({ ...currentService, is_active: checked })}
                    />
                    <Label className="text-sm text-gray-600 cursor-pointer">Servicio activo</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-100 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="h-12 px-6 font-bold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="h-12 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Guardar cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />)
        ) : (
          services.filter(s => !(isEditing && currentService.id && s.id === currentService.id)).map(service => (
            <Card
              key={service.id}
              className={cn(
                "border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1 flex flex-col justify-between",
                !service.is_active && "opacity-50 grayscale"
              )}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-normal">{service.description}</p>
                    )}
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border backdrop-blur-sm shrink-0",
                    service.is_active
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/20"
                      : "bg-gray-500/10 text-gray-600 border-gray-400/20"
                  )}>
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-primary/60" />
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                  <span className="font-black text-lg text-gray-900">
                    {formatCurrency(service.base_cost)}
                  </span>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 h-9 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => handleToggleActive(service)}
                  className={cn(
                    "flex-1 h-9 text-xs font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center",
                    service.is_active
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent"
                  )}
                >
                  {service.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="h-9 w-9 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-all duration-300 active:scale-95 flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
