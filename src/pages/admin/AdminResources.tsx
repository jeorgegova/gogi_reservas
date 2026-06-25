import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Building2,
  Edit2,
  Settings,
  X,
  Clock,
  Package,
  User,
} from 'lucide-react';
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
    { label: '30 min', value: 30 },
    { label: '1 hora', value: 60 },
    { label: '1h 30min', value: 90 },
    { label: '2 horas', value: 120 },
    { label: '3 horas', value: 180 },
  ];

  return (
    <select
      value={value || 60}
      onChange={e => onChange(parseInt(e.target.value))}
      className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 w-full"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

interface LinkedAddon {
  service_id: string;
  name: string;
  description: string;
  base_cost: number;
  duration_minutes: number;
  custom_price: number;
}

export default function AdminResourcesPage() {
  const { profile, terminology, businessType } = useAuth();
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>({
    name: '',
    description: '',
    specialty: '',
    employee_photo_url: '',
    resource_type: 'employee',
    display_order: 0,
    is_active: true,
    image_url: '',
  });

  const [linkedAddons, setLinkedAddons] = useState<LinkedAddon[]>([]);
  const [orgAddons, setOrgAddons] = useState<any[]>([]);
  const [showAddonSelector, setShowAddonSelector] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAreas();
      fetchOrgAddons();
    }
  }, [profile?.organization_id]);

  const fetchAreas = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAreas(data || []);
    } catch (e: any) {
      toast.error('Error al cargar empleados: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgAddons = async () => {
    if (!profile?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setOrgAddons(data || []);
    } catch (e: any) {
      toast.error('Error al cargar servicios disponibles: ' + e.message);
    }
  };

  const fetchLinkedAddons = async (areaId: string) => {
    try {
      const { data, error } = await supabase
        .from('resource_services')
        .select('*, services(*)')
        .eq('resource_id', areaId);
      if (error) throw error;
      if (data) {
        const mapped: LinkedAddon[] = data.map((row: any) => ({
          service_id: row.service_id,
          name: row.services?.name || '',
          description: row.services?.description || '',
          base_cost: row.services?.base_cost || 0,
          duration_minutes: row.services?.duration_minutes || 0,
          custom_price: row.custom_price ?? row.services?.base_cost ?? 0,
        }));
        setLinkedAddons(mapped);
      }
    } catch (e: any) {
      toast.error('Error al cargar servicios vinculados: ' + e.message);
    }
  };

  const handleEdit = async (area: any) => {
    setCurrentArea(area);
    setLinkedAddons([]);
    setIsEditing(true);
    setShowAddonSelector(false);
    await fetchLinkedAddons(area.id);
  };

  const handleStartNew = () => {
    setCurrentArea({
      name: '',
      description: '',
      specialty: '',
      employee_photo_url: '',
      resource_type: 'employee',
      display_order: 0,
      is_active: true,
      image_url: '',
    });
    setLinkedAddons([]);
    setShowAddonSelector(false);
    setIsEditing(true);
  };

  const handleToggleActive = async (area: any) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_active: !area.is_active })
        .eq('id', area.id)
        .eq('organization_id', profile?.organization_id);
      if (error) throw error;
      fetchAreas();
      toast.success('Estado del empleado actualizado');
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
  };

  const handleAddExistingAddon = (addon: any) => {
    const alreadyLinked = linkedAddons.find(la => la.service_id === addon.id);
    if (alreadyLinked) {
      toast.error('Este servicio ya está asignado a este empleado');
      return;
    }
    setLinkedAddons(prev => [...prev, {
      service_id: addon.id,
      name: addon.name,
      description: addon.description || '',
      base_cost: addon.base_cost || 0,
      duration_minutes: addon.duration_minutes || 0,
      custom_price: addon.base_cost || 0,
    }]);
    setShowAddonSelector(false);
  };

  const handleRemoveLinkedAddon = (addonId: string) => {
    setLinkedAddons(prev => prev.filter(la => la.service_id !== addonId));
  };

  const handleUpdateLinkedAddonPrice = (addonId: string, price: number) => {
    setLinkedAddons(prev => prev.map(la => la.service_id === addonId ? { ...la, custom_price: price } : la));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = profile?.organization_id;
    if (!orgId) return;

    if (!currentArea.name?.trim()) {
      toast.error('El nombre del empleado es obligatorio');
      return;
    }

    const areaData = {
      name: currentArea.name.trim(),
      description: currentArea.description || null,
      specialty: currentArea.specialty || null,
      employee_photo_url: currentArea.employee_photo_url || null,
      resource_type: currentArea.resource_type || 'employee',
      display_order: parseInt(currentArea.display_order as any) || 0,
      is_active: currentArea.is_active !== false,
      image_url: currentArea.image_url || null,
      organization_id: orgId
    };

    try {
      let areaId = currentArea.id;

      if (areaId) {
        const { error } = await supabase
          .from('resources')
          .update(areaData)
          .eq('id', areaId)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('resources')
          .insert(areaData)
          .select('id')
          .single();
        if (error) throw error;
        areaId = data.id;
      }

      // Sincronizar servicios en la tabla puente resource_services
      const { error: deleteError } = await supabase
        .from('resource_services')
        .delete()
        .eq('resource_id', areaId);
      if (deleteError) throw deleteError;

      if (linkedAddons.length > 0) {
        const inserts = linkedAddons.map(la => ({
          resource_id: areaId,
          service_id: la.service_id,
          custom_price: la.custom_price,
        }));
        const { error: junctionError } = await supabase
          .from('resource_services')
          .insert(inserts);
        if (junctionError) throw junctionError;
      }

      setIsEditing(false);
      fetchAreas();
      toast.success(currentArea.id ? 'Empleado actualizado con éxito' : 'Empleado creado con éxito');
    } catch (error: any) {
      console.error('Error saving area:', error);
      toast.error('Error al guardar: ' + error.message);
    }
  };

  const availableToAdd = orgAddons.filter(
    (oa: any) => !linkedAddons.find(la => la.service_id === oa.id)
  );

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
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Gestión de Empleados</h1>
            <p className="text-gray-500 text-xs md:text-sm">Configura los estilistas, barberos y técnicos disponibles.</p>
          </div>
        </div>
        <Button
          onClick={handleStartNew}
          className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-10 md:h-12 px-4 md:px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none text-xs md:text-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Empleado
        </Button>
      </div>

      {isEditing && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-gray-50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{currentArea.id ? 'Editar Empleado' : 'Crear Nuevo Empleado'}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Completa los detalles del perfil laboral</p>
          </div>
          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Nombre Completo</Label>
                    <Input
                      value={currentArea.name}
                      onChange={e => setCurrentArea({ ...currentArea, name: e.target.value })}
                      placeholder="Ej: Juan Pérez"
                      required
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Descripción / Biografía</Label>
                    <Input
                      value={currentArea.description || ''}
                      onChange={e => setCurrentArea({ ...currentArea, description: e.target.value })}
                      placeholder="Ej: Especialista en cortes modernos y barbería clásica"
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Especialidad (Etiqueta rápida)</Label>
                    <Input
                      value={currentArea.specialty || ''}
                      onChange={e => setCurrentArea({ ...currentArea, specialty: e.target.value })}
                      placeholder="Ej: Colorista, Barbero, Técnico..."
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">URL Foto de Empleado</Label>
                    <Input
                      value={currentArea.employee_photo_url || ''}
                      onChange={e => setCurrentArea({ ...currentArea, employee_photo_url: e.target.value })}
                      placeholder="https://..."
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">URL Imagen de Fondo (Opcional)</Label>
                    <Input
                      value={currentArea.image_url || ''}
                      onChange={e => setCurrentArea({ ...currentArea, image_url: e.target.value })}
                      placeholder="https://..."
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-gray-400">Tipo de Recurso</Label>
                      <select
                        value={currentArea.resource_type || 'employee'}
                        onChange={e => setCurrentArea({ ...currentArea, resource_type: e.target.value })}
                        className="w-full h-10 rounded-lg text-sm border border-gray-200 bg-white px-3"
                      >
                        <option value="employee">Empleado / Personal</option>
                        <option value="facility">Instalación</option>
                        <option value="room">Sala</option>
                        <option value="court">Cancha</option>
                        <option value="equipment">Equipamiento</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-gray-400">Orden Visualización</Label>
                      <Input
                        type="number"
                        value={currentArea.display_order || 0}
                        onChange={e => setCurrentArea({ ...currentArea, display_order: parseInt(e.target.value) || 0 })}
                        className="h-10 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={currentArea.is_active}
                      onCheckedChange={checked => setCurrentArea({ ...currentArea, is_active: checked })}
                    />
                    <Label className="text-sm text-gray-600 cursor-pointer">Empleado disponible y activo</Label>
                  </div>
                </div>
              </div>

              {/* SERVICES MANAGEMENT */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-bold text-gray-900">Servicios que puede realizar este empleado</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowAddonSelector(!showAddonSelector); }}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Asignar Servicio
                  </Button>
                </div>

                {linkedAddons.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {linkedAddons.map((la) => (
                      <div key={la.service_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{la.name}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatDuration(la.duration_minutes)}
                            </span>
                          </div>
                          {la.description && <p className="text-[10px] text-gray-400 truncate">{la.description}</p>}
                          <span className="text-[10px] text-gray-400">Precio base global: {formatCurrency(la.base_cost)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] uppercase font-bold text-gray-400 whitespace-nowrap">Precio personalizado:</Label>
                          <CurrencyInput
                            value={la.custom_price}
                            onChange={(val) => handleUpdateLinkedAddonPrice(la.service_id, val)}
                            className="h-8 rounded-lg text-xs w-32"
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveLinkedAddon(la.service_id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {linkedAddons.length === 0 && !showAddonSelector && (
                  <p className="text-xs text-gray-400 text-center py-3">Sin servicios asignados. Haz clic en "Asignar Servicio" para vincular los servicios que puede realizar este empleado.</p>
                )}

                {showAddonSelector && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Seleccionar servicio existente para el empleado</Label>
                    {availableToAdd.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {availableToAdd.map((addon: any) => (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => handleAddExistingAddon(addon)}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <div>
                              <span className="text-sm font-medium text-gray-900">{addon.name}</span>
                              <span className="text-[10px] text-gray-400 ml-2">{formatDuration(addon.duration_minutes)}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500">{formatCurrency(addon.base_cost)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">Todos los servicios disponibles ya han sido asignados</p>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddonSelector(false); }} className="w-full text-xs text-gray-500">
                      Cerrar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-100 mt-8">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-6 font-bold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">Cancelar</Button>
                <Button type="submit" className="h-12 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">Guardar cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />)
        ) : (
          areas.filter(area => !(isEditing && currentArea.id && area.id === currentArea.id)).map((area) => (
            <Card key={area.id}
              className={cn(
                "border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1 flex flex-col justify-between",
                !area.is_active && "opacity-50 grayscale"
              )}
            >
              <div>
                <div className="relative overflow-hidden h-36 md:h-44 flex flex-col items-center justify-center bg-gray-50 pt-6 pb-4 rounded-t-2xl">
                  {area.employee_photo_url || area.image_url ? (
                    <img src={area.employee_photo_url || area.image_url} alt={area.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                      <User className="w-10 h-10 md:w-12 md:h-12 text-primary/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t via-transparent from-black/50 to-transparent" />
                  <div className="absolute bottom-1.5 left-2 right-2">
                    <h3 className="font-bold text-white text-xs md:text-sm drop-shadow-lg truncate">{area.name}</h3>
                  </div>
                  <div className={cn(
                    "absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase border backdrop-blur-sm",
                    area.is_active
                      ? "bg-emerald-500/90 text-white border-emerald-400/50"
                      : "bg-gray-500/80 text-white border-gray-400/50"
                  )}>
                    {area.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                  {area.specialty && (
                    <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold shadow-sm">
                      <span className="text-primary">{area.specialty}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 md:p-3.5 space-y-1.5 md:space-y-2">
                  {area.description && (
                    <p className="text-[9px] md:text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{area.description}</p>
                  )}
                  <div className="text-[9px] md:text-[10px] text-gray-500 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                    <span>Tipo: {area.resource_type}</span>
                    <span>Orden: {area.display_order}</span>
                  </div>
                </div>
              </div>
              <div className="p-2.5 md:p-3.5 pt-0">
                <div className="flex gap-1.5 border-t border-gray-50 pt-2">
                  <button
                    onClick={() => handleEdit(area)}
                    className="flex-1 h-8 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[9px] md:text-xs font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-0.5 md:gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(area)}
                    className={cn(
                      "flex-1 h-8 text-[9px] md:text-xs font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center",
                      area.is_active
                        ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                        : "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent"
                    )}
                  >
                    {area.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
