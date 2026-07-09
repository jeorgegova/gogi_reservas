import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Package, User, Trash2, Building2, GripVertical } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

function CurrencyInput({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState('');
  const fn = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  useEffect(() => { setDisplayValue(value ? fn(value) : ''); }, [value]);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <Input type="text" value={displayValue} onChange={e => { const n = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0; onChange(n); setDisplayValue(n ? fn(n) : ''); }} onFocus={() => { if (value) setDisplayValue(String(value)); }} className={cn("pl-6", className)} placeholder={placeholder || "0"} />
    </div>
  );
}

interface LinkedAddon {
  service_id: string; name: string; description: string; base_cost: number; duration_minutes: number; custom_price: number;
}

export default function AdminResourcesPage() {
  const { profile, terminology } = useAuth();
  const queryClient = useQueryClient();
  const [orgBusinessType, setOrgBusinessType] = useState<string>('residential');
  const isResidential = orgBusinessType === 'residential';

  useEffect(() => {
    if (profile?.organization_id) {
      supabase.from('organizations').select('business_type').eq('id', profile.organization_id).single().then(({ data }) => {
        if (data) setOrgBusinessType(data.business_type);
      });
    }
  }, [profile?.organization_id]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>({ name: '', description: '', specialty: '', employee_photo_url: '', resource_type: isResidential ? 'facility' : 'employee', display_order: 0, is_active: true, image_url: '', commission_percentage: 0, is_free: false, pricing_type: 'hourly', cost_per_hour: 0, fixed_cost: 0, max_hours_per_reservation: 4, estimated_duration_minutes: 60, cost_jornada_diurna: 0, cost_jornada_nocturna: 0, cost_jornada_ambos: 0, jornada_start_diurna: '08:00', jornada_end_diurna: '18:00', jornada_start_nocturna: '18:00', jornada_end_nocturna: '23:59' });

  const [linkedAddons, setLinkedAddons] = useState<LinkedAddon[]>([]);
  const [orgAddons, setOrgAddons] = useState<any[]>([]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const dragIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [allServiceAddons, setAllServiceAddons] = useState<Record<string, any[]>>({});
  const [enabledAddonIds, setEnabledAddonIds] = useState<Record<string, string[]>>({});

  useEffect(() => { if (profile?.organization_id) { fetchAreas(); fetchOrgAddons(); } }, [profile?.organization_id]);

  const fetchAreas = async () => {
    if (!profile?.organization_id) return; setLoading(true);
    const { data, error } = await supabase.from('resources').select('*').eq('organization_id', profile.organization_id).order('display_order', { ascending: true }).order('created_at', { ascending: false });
    if (error) { toast.error('Error al cargar: ' + error.message); } else { setAreas(data || []); }
    setLoading(false);
  };

  const fetchOrgAddons = async () => {
    if (!profile?.organization_id) return;
    const { data, error } = await supabase.from('services').select('*').eq('organization_id', profile.organization_id).eq('is_active', true).order('name');
    if (error) { toast.error('Error al cargar servicios: ' + error.message); } else { setOrgAddons(data || []); }
  };

  const saveCurrentOrder = async () => {
    try {
      await Promise.all(areas.map((item, idx) =>
        supabase.from('resources').update({ display_order: idx }).eq('id', item.id).eq('organization_id', profile?.organization_id)
      ));
      queryClient.invalidateQueries({ queryKey: ['resources', profile?.organization_id] });
      toast.success('Orden guardado correctamente');
    } catch (e: any) { toast.error('Error al guardar orden: ' + e.message); fetchAreas(); }
  };

  const fetchLinkedAddons = async (areaId: string) => {
    const { data, error } = await supabase.from('resource_services').select('*, services(*)').eq('resource_id', areaId);
    if (error) { toast.error('Error al cargar servicios vinculados: ' + error.message); return; }
    if (data) {
      const mapped: LinkedAddon[] = data.map((row: any) => ({
        service_id: row.service_id, name: row.services?.name || '', description: row.services?.description || '', base_cost: row.services?.base_cost || 0, duration_minutes: row.services?.duration_minutes || 0, custom_price: row.custom_price ?? row.services?.base_cost ?? 0,
      }));
      setLinkedAddons(mapped);
      await fetchAddonConfigs(areaId, mapped.map(s => s.service_id));
    }
  };

  const fetchAddonConfigs = async (resourceId: string, serviceIds: string[]) => {
    const allMap: Record<string, any[]> = {};
    const enabledMap: Record<string, string[]> = {};
    await Promise.all(serviceIds.map(async (sid) => {
      const { data: links } = await supabase.from('service_addon_links').select('addon_id').eq('service_id', sid);
      const addonIds = (links || []).map((l: any) => l.addon_id);
      if (addonIds.length > 0) {
        const { data: addons } = await supabase.from('service_addons').select('*').in('id', addonIds).eq('is_active', true).order('display_order', { ascending: true });
        allMap[sid] = addons || [];
      } else { allMap[sid] = []; }
      const { data: configs } = await supabase.from('resource_addon_configs').select('addon_id').eq('resource_id', resourceId).eq('service_id', sid);
      enabledMap[sid] = (configs || []).map((c: any) => c.addon_id);
    }));
    setAllServiceAddons(allMap);
    setEnabledAddonIds(enabledMap);
  };

  const handleEdit = async (area: any) => {
    setCurrentArea(area); setLinkedAddons([]); setAllServiceAddons({}); setEnabledAddonIds({}); setIsEditing(true); setShowServicePicker(false);
    if (!isResidential) await fetchLinkedAddons(area.id);
  };

  const handleStartNew = () => {
    setCurrentArea({ name: '', description: '', specialty: '', employee_photo_url: '', resource_type: isResidential ? 'facility' : 'employee', display_order: areas.length, is_active: true, image_url: '', commission_percentage: 0, is_free: false, pricing_type: 'hourly', cost_per_hour: 0, fixed_cost: 0, max_hours_per_reservation: 4, estimated_duration_minutes: 60, cost_jornada_diurna: 0, cost_jornada_nocturna: 0, cost_jornada_ambos: 0, jornada_start_diurna: '08:00', jornada_end_diurna: '18:00', jornada_start_nocturna: '18:00', jornada_end_nocturna: '23:59' });
    setLinkedAddons([]); setAllServiceAddons({}); setEnabledAddonIds({}); setShowServicePicker(false); setIsEditing(true);
  };

  const handleToggleActive = async (area: any) => {
    await supabase.from('resources').update({ is_active: !area.is_active }).eq('id', area.id).eq('organization_id', profile?.organization_id);
    fetchAreas();
  };

  const handleAddService = (svc: any) => {
    if (linkedAddons.find(la => la.service_id === svc.id)) { toast.error('Este servicio ya está asignado'); return; }
    setLinkedAddons(prev => [...prev, { service_id: svc.id, name: svc.name, description: svc.description || '', base_cost: svc.base_cost || 0, duration_minutes: svc.duration_minutes || 0, custom_price: svc.base_cost || 0 }]);
    setShowServicePicker(false);
  };

  const handleRemoveService = (serviceId: string) => setLinkedAddons(prev => prev.filter(la => la.service_id !== serviceId));
  const handleUpdatePrice = (serviceId: string, price: number) => setLinkedAddons(prev => prev.map(la => la.service_id === serviceId ? { ...la, custom_price: price } : la));
  const toggleAddon = (serviceId: string, addonId: string) => setEnabledAddonIds(prev => { const cur = prev[serviceId] || []; return { ...prev, [serviceId]: cur.includes(addonId) ? cur.filter(id => id !== addonId) : [...cur, addonId] }; });

  const confirmDeleteResource = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await supabase.from('resources').delete().eq('id', deleteTarget.id);
      fetchAreas(); toast.success('Eliminado');
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setDeleteLoading(false); setDeleteTarget(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !currentArea.name?.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (submitting) return;
    setSubmitting(true);
    const areaData: any = {
      name: currentArea.name.trim(), description: currentArea.description || null, specialty: currentArea.specialty || null,
      employee_photo_url: currentArea.employee_photo_url || null, resource_type: currentArea.resource_type || (isResidential ? 'facility' : 'employee'),
      display_order: parseInt(currentArea.display_order as any) || 0, is_active: currentArea.is_active !== false,
      image_url: currentArea.image_url || null, commission_percentage: currentArea.commission_percentage || 0, organization_id: profile.organization_id
    };
    if (isResidential) {
      areaData.is_free = currentArea.is_free || false;
      areaData.pricing_type = currentArea.pricing_type || 'hourly';
      areaData.cost_per_hour = currentArea.cost_per_hour || 0;
      areaData.fixed_cost = currentArea.fixed_cost || 0;
      areaData.max_hours_per_reservation = currentArea.max_hours_per_reservation || 4;
      areaData.estimated_duration_minutes = currentArea.estimated_duration_minutes || 60;
      areaData.cost_jornada_diurna = currentArea.cost_jornada_diurna || 0;
      areaData.cost_jornada_nocturna = currentArea.cost_jornada_nocturna || 0;
      areaData.cost_jornada_ambos = currentArea.cost_jornada_ambos || 0;
      areaData.jornada_start_diurna = currentArea.jornada_start_diurna || '08:00';
      areaData.jornada_end_diurna = currentArea.jornada_end_diurna || '18:00';
      areaData.jornada_start_nocturna = currentArea.jornada_start_nocturna || '18:00';
      areaData.jornada_end_nocturna = currentArea.jornada_end_nocturna || '23:59';
    }
    try {
      let areaId = currentArea.id;
      if (areaId) {
        await supabase.from('resources').update(areaData).eq('id', areaId).eq('organization_id', profile.organization_id);
      } else {
        const { data, error } = await supabase.from('resources').insert(areaData).select('id').single();
        if (error) throw error; areaId = data.id;
      }
      await supabase.from('resource_services').delete().eq('resource_id', areaId);
      if (linkedAddons.length > 0) await supabase.from('resource_services').insert(linkedAddons.map(la => ({ resource_id: areaId, service_id: la.service_id, custom_price: la.custom_price })));
      await supabase.from('resource_addon_configs').delete().eq('resource_id', areaId);
      const configs: any[] = [];
      Object.entries(enabledAddonIds).forEach(([sid, aids]) => aids.forEach(aid => configs.push({ resource_id: areaId, service_id: sid, addon_id: aid })));
      if (configs.length > 0) await supabase.from('resource_addon_configs').insert(configs);
      setIsEditing(false); fetchAreas();
      toast.success(currentArea.id ? (isResidential ? `${terminology.areaLabel} actualizada` : 'Empleado actualizado') : (isResidential ? `${terminology.areaLabel} creada` : 'Empleado creado'));
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setSubmitting(false); }
  };

  const availableToAdd = orgAddons.filter((oa: any) => !linkedAddons.find(la => la.service_id === oa.id));
  const fd = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h ${m}min`; };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg shadow-primary/25 ring-1 ring-white/20">{isResidential ? <Building2 className="h-5 w-5 text-white" /> : <User className="h-5 w-5 text-white" />}</div>
          <div><h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">{isResidential ? `Gestión de ${terminology.areaLabel}s` : 'Gestión de Empleados'}</h1><p className="text-gray-500 text-xs md:text-sm">{isResidential ? 'Configura las áreas comunes disponibles para reservar.' : 'Configura los profesionales y los servicios que ofrecen.'}</p></div>
        </div>
        <Button onClick={handleStartNew} className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-10 md:h-12 px-4 md:px-6 rounded-xl border-none text-xs md:text-sm shrink-0"><Plus className="w-4 h-4 mr-1.5" /> {isResidential ? `Nueva ${terminology.areaLabel}` : 'Nuevo Empleado'}</Button>
      </div>

      {/* EDIT FORM */}
      {isEditing && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <div><h2 className="text-xl font-black text-gray-900">{currentArea.id ? (isResidential ? `Editar ${terminology.areaLabel}` : 'Editar Empleado') : (isResidential ? `Crear Nueva ${terminology.areaLabel}` : 'Crear Nuevo Empleado')}</h2><p className="text-sm text-gray-500 mt-1">{isResidential ? 'Configura los detalles del área común.' : 'Perfil, servicios y adicionales disponibles'}</p></div>
            {currentArea.employee_photo_url && (
              <img src={currentArea.employee_photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow" />
            )}
          </div>
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic info */}
              {isResidential ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><Label className="text-[10px] uppercase font-bold text-gray-400">Nombre del Área</Label><Input value={currentArea.name} onChange={e => setCurrentArea({ ...currentArea, name: e.target.value })} placeholder="Ej: Piscina, Salón Social, BBQ" required className="h-10 rounded-lg text-sm mt-1" /></div>
                    <div><Label className="text-[10px] uppercase font-bold text-gray-400">Descripción</Label><Input value={currentArea.description || ''} onChange={e => setCurrentArea({ ...currentArea, description: e.target.value })} placeholder="Describe el área y sus reglas de uso" className="h-10 rounded-lg text-sm mt-1" /></div>
                    <div><Label className="text-[10px] uppercase font-bold text-gray-400">URL Imagen del Área</Label><Input value={currentArea.image_url || ''} onChange={e => setCurrentArea({ ...currentArea, image_url: e.target.value })} placeholder="https://..." className="h-10 rounded-lg text-sm mt-1" /></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><Switch checked={currentArea.is_free || false} onCheckedChange={c => setCurrentArea({ ...currentArea, is_free: c })} /><Label className="text-sm text-gray-600 cursor-pointer">Área gratuita (sin costo)</Label></div>
                    {!currentArea.is_free && (
                      <>
                        <div><Label className="text-[10px] uppercase font-bold text-gray-400">Tipo de Precio</Label>
                          <select value={currentArea.pricing_type || 'hourly'} onChange={e => setCurrentArea({ ...currentArea, pricing_type: e.target.value })} className="w-full h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 mt-1">
                            <option value="hourly">Por Hora</option>
                            <option value="jornada">Por Jornada (Día/Noche)</option>
                            <option value="fixed">Precio Fijo</option>
                          </select>
                        </div>
                        {currentArea.pricing_type === 'hourly' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-[10px] uppercase font-bold text-gray-400">Costo por Hora</Label><CurrencyInput value={currentArea.cost_per_hour || 0} onChange={v => setCurrentArea({ ...currentArea, cost_per_hour: v })} className="h-10 rounded-lg text-sm mt-1" /></div>
                            <div><Label className="text-[10px] uppercase font-bold text-gray-400">Máx. Horas por Reserva</Label><Input type="number" min="1" max="24" value={currentArea.max_hours_per_reservation || 4} onChange={e => setCurrentArea({ ...currentArea, max_hours_per_reservation: parseInt(e.target.value) || 4 })} className="h-10 rounded-lg text-sm mt-1" /></div>
                          </div>
                        ) : currentArea.pricing_type === 'jornada' ? (
                          <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <Label className="text-[9px] uppercase font-bold text-gray-500">Jornada Diurna</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div><Label className="text-[9px] text-gray-400">Desde</Label><Input type="time" value={currentArea.jornada_start_diurna || '08:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_start_diurna: e.target.value })} className="h-9 rounded-lg text-xs" /></div>
                              <div><Label className="text-[9px] text-gray-400">Hasta</Label><Input type="time" value={currentArea.jornada_end_diurna || '18:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_end_diurna: e.target.value })} className="h-9 rounded-lg text-xs" /></div>
                              <div><Label className="text-[9px] text-gray-400">Costo</Label><CurrencyInput value={currentArea.cost_jornada_diurna || 0} onChange={v => setCurrentArea({ ...currentArea, cost_jornada_diurna: v })} className="h-9 rounded-lg text-xs" /></div>
                            </div>
                            <Label className="text-[9px] uppercase font-bold text-gray-500">Jornada Nocturna</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div><Label className="text-[9px] text-gray-400">Desde</Label><Input type="time" value={currentArea.jornada_start_nocturna || '18:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_start_nocturna: e.target.value })} className="h-9 rounded-lg text-xs" /></div>
                              <div><Label className="text-[9px] text-gray-400">Hasta</Label><Input type="time" value={currentArea.jornada_end_nocturna || '23:59'} onChange={e => setCurrentArea({ ...currentArea, jornada_end_nocturna: e.target.value })} className="h-9 rounded-lg text-xs" /></div>
                              <div><Label className="text-[9px] text-gray-400">Costo</Label><CurrencyInput value={currentArea.cost_jornada_nocturna || 0} onChange={v => setCurrentArea({ ...currentArea, cost_jornada_nocturna: v })} className="h-9 rounded-lg text-xs" /></div>
                            </div>
                            <Label className="text-[9px] uppercase font-bold text-gray-500">Jornada Completa (Día + Noche)</Label>
                            <div className="w-40"><Label className="text-[9px] text-gray-400">Costo</Label><CurrencyInput value={currentArea.cost_jornada_ambos || 0} onChange={v => setCurrentArea({ ...currentArea, cost_jornada_ambos: v })} className="h-9 rounded-lg text-xs" /></div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-[10px] uppercase font-bold text-gray-400">Costo Fijo</Label><CurrencyInput value={currentArea.fixed_cost || 0} onChange={v => setCurrentArea({ ...currentArea, fixed_cost: v })} className="h-10 rounded-lg text-sm mt-1" /></div>
                            <div><Label className="text-[10px] uppercase font-bold text-gray-400">Duración (minutos)</Label><Input type="number" min="15" step="15" value={currentArea.estimated_duration_minutes || 60} onChange={e => setCurrentArea({ ...currentArea, estimated_duration_minutes: parseInt(e.target.value) || 60 })} className="h-10 rounded-lg text-sm mt-1" /></div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-3 pt-1"><Switch checked={currentArea.is_active} onCheckedChange={c => setCurrentArea({ ...currentArea, is_active: c })} /><Label className="text-sm text-gray-600 cursor-pointer">Área disponible y visible</Label></div>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><Label className="text-[10px] uppercase font-bold text-gray-400">Nombre Completo</Label><Input value={currentArea.name} onChange={e => setCurrentArea({ ...currentArea, name: e.target.value })} placeholder="Ej: Juan Pérez" required className="h-10 rounded-lg text-sm mt-1" /></div>
                  <div><Label className="text-[10px] uppercase font-bold text-gray-400">Especialidad (etiqueta visible)</Label><Input value={currentArea.specialty || ''} onChange={e => setCurrentArea({ ...currentArea, specialty: e.target.value })} placeholder="Ej: Colorista, Barbero" className="h-10 rounded-lg text-sm mt-1" /></div>
                  <div><Label className="text-[10px] uppercase font-bold text-gray-400">Descripción / Biografía</Label><Input value={currentArea.description || ''} onChange={e => setCurrentArea({ ...currentArea, description: e.target.value })} placeholder="Especialista en cortes modernos" className="h-10 rounded-lg text-sm mt-1" /></div>
                </div>
                <div className="space-y-4">
                  <div><Label className="text-[10px] uppercase font-bold text-gray-400">URL Foto del Empleado (circular)</Label><Input value={currentArea.employee_photo_url || ''} onChange={e => setCurrentArea({ ...currentArea, employee_photo_url: e.target.value })} placeholder="https://..." className="h-10 rounded-lg text-sm mt-1" /></div>
                  <div><Label className="text-[10px] uppercase font-bold text-gray-400">URL Imagen de Portada (fondo)</Label><Input value={currentArea.image_url || ''} onChange={e => setCurrentArea({ ...currentArea, image_url: e.target.value })} placeholder="https://..." className="h-10 rounded-lg text-sm mt-1" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-[10px] uppercase font-bold text-gray-400">Tipo</Label>
                      <select value={currentArea.resource_type || 'employee'} onChange={e => setCurrentArea({ ...currentArea, resource_type: e.target.value })} className="w-full h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 mt-1">
                        <option value="employee">Empleado</option><option value="facility">Instalación</option><option value="room">Sala</option><option value="court">Cancha</option><option value="equipment">Equipo</option><option value="general">General</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {!isResidential && (
                      <div><Label className="text-[10px] uppercase font-bold text-gray-400">Comisión (%)</Label><Input type="number" min="0" max="100" value={currentArea.commission_percentage || 0} onChange={e => setCurrentArea({ ...currentArea, commission_percentage: parseFloat(e.target.value) || 0 })} className="h-10 rounded-lg text-sm mt-1" placeholder="0" /></div>
                    )}
                    <div className={cn("flex items-end pb-1", isResidential && "col-span-2")}><p className="text-[10px] text-gray-400">{isResidential ? 'Configura nombre, imagen y descripción del área.' : '% de ganancia para el empleado. 0 = sin comisión.'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 pt-1"><Switch checked={currentArea.is_active} onCheckedChange={c => setCurrentArea({ ...currentArea, is_active: c })} /><Label className="text-sm text-gray-600 cursor-pointer">Activo y visible para clientes</Label></div>
                </div>
              </div>
              )}

              {/* Services section - only for non-residential */}
              {!isResidential && (
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /><h3 className="text-base font-bold text-gray-900">Servicios que realiza</h3></div>
                  <Button type="button" variant="outline" onClick={() => setShowServicePicker(!showServicePicker)} className="h-9 text-xs font-bold rounded-xl border-gray-200"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar Servicio</Button>
                </div>

                {/* Service picker dropdown */}
                {showServicePicker && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Servicios disponibles en el catálogo:</Label>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableToAdd.length > 0 ? availableToAdd.map(svc => (
                        <button key={svc.id} type="button" onClick={() => handleAddService(svc)} className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white hover:bg-primary/5 border border-gray-100 hover:border-primary/20 transition-all text-left">
                          <div><span className="text-sm font-medium text-gray-900">{svc.name}</span><span className="text-[10px] text-gray-400 ml-2">{fd(svc.duration_minutes)}</span></div>
                          <span className="text-xs font-bold text-gray-500">{formatCurrency(svc.base_cost)}</span>
                        </button>
                      )) : <p className="text-xs text-gray-400 text-center py-2">Todos los servicios ya fueron asignados</p>}
                    </div>
                    <button type="button" onClick={() => setShowServicePicker(false)} className="w-full text-[10px] text-gray-400 hover:text-gray-600 pt-1">Cerrar</button>
                  </div>
                )}

                {/* Assigned services */}
                {linkedAddons.length === 0 && !showServicePicker && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Sin servicios asignados</p>
                    <p className="text-[11px] text-gray-300 mt-1">Hacé clic en "Agregar Servicio" para empezar</p>
                  </div>
                )}

                {linkedAddons.map((la) => {
                  const addons = allServiceAddons[la.service_id] || [];
                  const enabledIds = enabledAddonIds[la.service_id] || [];
                  return (
                    <div key={la.service_id} className="mb-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
                      {/* Service header */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm break-words">{la.name}</span>
                            <span className="px-2 py-0.5 bg-gray-200 rounded-full text-[10px] text-gray-500 font-medium shrink-0">{fd(la.duration_minutes)}</span>
                          </div>
                          {la.description && <p className="text-[11px] text-gray-400 mt-0.5 break-words">{la.description}</p>}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Precio:</span>
                            <CurrencyInput value={la.custom_price} onChange={(v) => handleUpdatePrice(la.service_id, v)} className="h-8 rounded-lg text-xs w-28" placeholder="Precio" />
                          </div>
                          <button type="button" onClick={() => handleRemoveService(la.service_id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>

                      {/* Addons for this service */}
                      <div className="border-t border-gray-100 p-3 sm:p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Adicionales disponibles:</span>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{enabledIds.length} de {addons.length} activos</span>
                        </div>
                        {addons.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic leading-relaxed">Este servicio no tiene adicionales configurados. Creá adicionales globales y vinculalos al servicio en "Catálogo de Servicios".</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
                            {addons.map((addon: any) => {
                              const checked = enabledIds.includes(addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  type="button"
                                  onClick={() => toggleAddon(la.service_id, addon.id)}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left",
                                    checked
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600"
                                  )}
                                >
                                  <span className={cn("w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0", checked ? "bg-white text-indigo-600 border-white" : "bg-gray-50 border-gray-300 text-transparent")}>✓</span>
                                  <span className="break-words">{addon.name}</span>
                                  <span className={cn("text-[10px] shrink-0", checked ? "text-indigo-200" : "text-gray-400")}>+{formatCurrency(addon.additional_cost)}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-6 font-bold rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={submitting} className="h-12 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* CARDS */}
      <div className={cn("grid gap-4", isResidential ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
        {loading ? [1, 2, 3].map(i => <div key={i} className="h-56 bg-gray-50 animate-pulse rounded-2xl" />) : (
          areas.filter(a => !(isEditing && currentArea.id && a.id === currentArea.id)).map((area, idx) => {
            const handleDelete = () => setDeleteTarget(area);
            if (isResidential) {
              return (
                <Card key={area.id} className={cn("border-none apple-shadow bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1 flex flex-col", !area.is_active && "opacity-50 grayscale")}>
                  <div className="h-36 bg-gray-100 overflow-hidden">
                    {area.image_url ? <img src={area.image_url} alt={area.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center"><Building2 className="w-10 h-10 text-primary/20" /></div>}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{area.name}</h3>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0", area.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200")}>{area.is_active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    {area.description && <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 flex-1">{area.description}</p>}
                    <div className="text-[10px] text-gray-400 mb-1">{area.is_free ? 'Gratuito' : area.pricing_type === 'hourly' ? `${formatCurrency(area.cost_per_hour)}/hora` : area.pricing_type === 'jornada' ? `Jornada desde ${formatCurrency(area.cost_jornada_diurna)}` : `${formatCurrency(area.fixed_cost)} fijo`}</div>
                    <div className="flex gap-1.5 pt-3 border-t border-gray-50">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(area); }} className="flex-1 h-8 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleActive(area); }} className={cn("flex-1 h-8 text-[10px] font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center", area.is_active ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200" : "bg-emerald-500 text-white hover:bg-emerald-600")}>{area.is_active ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="h-8 w-8 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-all active:scale-95 flex items-center justify-center shrink-0"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </Card>
              );
            }
            return (
              <Card key={area.id} className={cn(
                "border-none apple-shadow bg-white rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:apple-shadow-hover flex flex-col overflow-hidden relative group cursor-pointer",
                !area.is_active && "opacity-50 grayscale",
                draggingId === area.id && "opacity-30 scale-95"
              )}
                onClick={() => handleEdit(area)}
                draggable
                onDragStart={() => { dragIdRef.current = area.id; setDraggingId(area.id); }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragIdRef.current && dragIdRef.current !== area.id) {
                    setAreas(prev => {
                      const fromIdx = prev.findIndex(a => a.id === dragIdRef.current);
                      if (fromIdx === -1) return prev;
                      const list = [...prev];
                      const [moved] = list.splice(fromIdx, 1);
                      list.splice(idx, 0, moved);
                      return list;
                    });
                  }
                }}
                onDragEnd={() => { dragIdRef.current = null; setDraggingId(null); saveCurrentOrder(); }}
              >
                <div onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm text-gray-500 hover:text-gray-700 hover:bg-white cursor-grab active:cursor-grabbing transition-all">
                  <GripVertical className="w-4 h-4" strokeWidth={2.5} />
                </div>
                {area.image_url && (
                  <div className="w-full h-24 bg-gray-100 relative shrink-0">
                    <img src={area.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
                  </div>
                )}
                <div className={cn("p-4 flex flex-col items-center", area.image_url ? "relative z-10 pt-0" : "")}>
                  <div className={cn("w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-sm", area.image_url ? "-mt-10 mb-2" : "mx-auto mb-2.5")}>
                    {area.employee_photo_url ? <img src={area.employee_photo_url} alt={area.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center"><User className="w-8 h-8 text-primary/40" /></div>}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight mb-0.5 px-1">{area.name}</h3>
                    <p className="text-[11px] text-gray-500 px-1">{area.specialty || 'Profesional'}</p>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border", area.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200")}>{area.is_active ? 'Activo' : 'Inactivo'}</span>
                    {area.commission_percentage > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">{area.commission_percentage}% com</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-50 w-full">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(area); }} className="flex-1 min-w-[68px] h-8 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 px-2"><Edit2 className="w-3 h-3" /> Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleActive(area); }} className={cn("flex-1 min-w-[68px] h-8 text-[10px] font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center px-1", area.is_active ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200" : "bg-emerald-500 text-white hover:bg-emerald-600")}>{area.is_active ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="flex-1 sm:flex-none h-8 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-all active:scale-95 flex items-center justify-center gap-1 px-2"><Trash2 className="w-3 h-3" /> <span className="text-[10px] font-bold sm:hidden">Eliminar</span></button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Eliminar ${deleteTarget?.name || ''}`}
        description={`¿Estás seguro de que quieres eliminar a ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={confirmDeleteResource}
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  );
}
