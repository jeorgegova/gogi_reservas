import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Clock, Trash2, Package, ListPlus, Link, Unlink } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

function CurrencyInput({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState('');
  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  useEffect(() => { if (value) setDisplayValue(formatNumber(value)); else setDisplayValue(''); }, [value]);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <Input type="text" value={displayValue} onChange={e => { const n = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0; onChange(n); setDisplayValue(n ? formatNumber(n) : ''); }} onFocus={() => { if (value) setDisplayValue(value.toString()); }} className={cn("pl-6", className)} placeholder={placeholder || "0"} />
    </div>
  );
}

function DurationSelector({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const options = [
    { label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '45 min', value: 45 },
    { label: '1 hora', value: 60 }, { label: '1h 15min', value: 75 }, { label: '1h 30min', value: 90 },
    { label: '1h 45min', value: 105 }, { label: '2 horas', value: 120 }, { label: '2h 30min', value: 150 }, { label: '3 horas', value: 180 },
  ];
  return (
    <select value={value || 30} onChange={e => onChange(parseInt(e.target.value))} className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 w-full">
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

export default function AdminServicesPage() {
  const { profile } = useAuth();
  const [orgBusinessType, setOrgBusinessType] = useState<string>('residential');
  const isResidential = orgBusinessType === 'residential';

  useEffect(() => {
    if (profile?.organization_id) {
      supabase.from('organizations').select('business_type').eq('id', profile.organization_id).single().then(({ data }) => {
        if (data) setOrgBusinessType(data.business_type);
      });
    }
  }, [profile?.organization_id]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<any>({ name: '', description: '', base_cost: 0, duration_minutes: 30, is_active: true, image_url: '' });

  // Global addons
  const [allAddons, setAllAddons] = useState<any[]>([]);
  const [showAddonPanel, setShowAddonPanel] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  const [addonForm, setAddonForm] = useState({ name: '', description: '', additional_cost: 0, additional_duration_minutes: 0, is_active: true });

  // Per-service linked addons
  const [linkedAddonsMap, setLinkedAddonsMap] = useState<Record<string, string[]>>({});
  const [openLinkServiceId, setOpenLinkServiceId] = useState<string | null>(null);

  useEffect(() => { if (profile?.organization_id) { fetchServices(); fetchAllAddons(); } }, [profile?.organization_id]);

  const fetchServices = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('services').select('*').eq('organization_id', profile.organization_id).order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
      if (data) {
        const map: Record<string, string[]> = {};
        await Promise.all(data.map(async (s: any) => {
          const { data: links } = await supabase.from('service_addon_links').select('addon_id').eq('service_id', s.id);
          map[s.id] = (links || []).map((l: any) => l.addon_id);
        }));
        setLinkedAddonsMap(map);
      }
    } catch (e: any) { toast.error('Error al cargar: ' + e.message); } finally { setLoading(false); }
  };

  const fetchAllAddons = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase.from('service_addons').select('*').eq('organization_id', profile.organization_id).order('display_order', { ascending: true });
    setAllAddons(data || []);
  };

  const fetchLinkedAddons = async (serviceId: string) => {
    const { data: links } = await supabase.from('service_addon_links').select('addon_id').eq('service_id', serviceId);
    setLinkedAddonsMap(prev => ({ ...prev, [serviceId]: (links || []).map((l: any) => l.addon_id) }));
  };

  // Service CRUD
  const handleEdit = (service: any) => { setCurrentService(service); setIsEditing(true); };
  const handleStartNew = () => { setCurrentService({ name: '', description: '', base_cost: 0, duration_minutes: 30, is_active: true, image_url: '' }); setIsEditing(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !currentService.name?.trim()) return toast.error('Nombre obligatorio');
    const payload = { name: currentService.name.trim(), description: currentService.description || null, base_cost: currentService.base_cost || 0, duration_minutes: currentService.duration_minutes || 30, is_active: currentService.is_active !== false, image_url: currentService.image_url || null, organization_id: profile.organization_id };
    try {
      if (currentService.id) {
        await supabase.from('services').update(payload).eq('id', currentService.id).eq('organization_id', profile.organization_id);
        toast.success('Servicio actualizado');
      } else {
        await supabase.from('services').insert(payload);
        toast.success('Servicio creado');
      }
      setIsEditing(false); fetchServices();
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const handleToggleActive = async (service: any) => {
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id).eq('organization_id', profile?.organization_id);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este servicio?')) return;
    await supabase.from('services').delete().eq('id', id).eq('organization_id', profile?.organization_id);
    toast.success('Servicio eliminado'); fetchServices();
  };

  // Global addon CRUD
  const handleSaveAddon = async () => {
    if (!addonForm.name.trim()) return toast.error('Nombre obligatorio');
    if (!profile?.organization_id) return;
    const payload = { ...addonForm, name: addonForm.name.trim(), description: addonForm.description || null, organization_id: profile.organization_id };
    try {
      if (editingAddon?.id) {
        await supabase.from('service_addons').update(payload).eq('id', editingAddon.id);
        toast.success('Adicional actualizado');
      } else {
        await supabase.from('service_addons').insert(payload);
        toast.success('Adicional creado');
      }
      setEditingAddon(null); setAddonForm({ name: '', description: '', additional_cost: 0, additional_duration_minutes: 0, is_active: true }); fetchAllAddons();
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const handleEditAddon = (addon: any) => { setEditingAddon(addon); setAddonForm({ name: addon.name, description: addon.description || '', additional_cost: addon.additional_cost || 0, additional_duration_minutes: addon.additional_duration_minutes || 0, is_active: addon.is_active }); setShowAddonPanel(true); };

  const handleDeleteAddon = async (id: string) => {
    if (!window.confirm('¿Eliminar este adicional? Se desvinculará de todos los servicios.')) return;
    await supabase.from('service_addons').delete().eq('id', id);
    toast.success('Adicional eliminado'); fetchAllAddons(); fetchServices();
  };

  // Link/unlink addons to services
  const handleLinkAddon = async (serviceId: string, addonId: string) => {
    await supabase.from('service_addon_links').insert({ service_id: serviceId, addon_id: addonId });
    fetchLinkedAddons(serviceId);
  };

  const handleUnlinkAddon = async (serviceId: string, addonId: string) => {
    await supabase.from('service_addon_links').delete().eq('service_id', serviceId).eq('addon_id', addonId);
    fetchLinkedAddons(serviceId);
  };

  const getLinkedAddonObjects = (serviceId: string) => {
    const ids = linkedAddonsMap[serviceId] || [];
    return allAddons.filter(a => ids.includes(a.id));
  };

  const formatDuration = (min: number) => { const h = Math.floor(min / 60); const m = min % 60; return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h ${m}min`; };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20"><Package className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Servicios</h1>
            <p className="text-gray-500 text-xs md:text-sm">Configura servicios, adicionales globales y sus vínculos.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isResidential && (
            <Button onClick={() => { setShowAddonPanel(!showAddonPanel); setEditingAddon(null); setAddonForm({ name: '', description: '', additional_cost: 0, additional_duration_minutes: 0, is_active: true }); }} variant="outline" className="h-10 md:h-12 px-4 rounded-xl font-bold text-xs md:text-sm border-gray-200">
              <ListPlus className="w-4 h-4 mr-1.5" /> Adicionales
            </Button>
          )}
          <Button onClick={handleStartNew} className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-10 md:h-12 px-4 md:px-6 rounded-xl border-none text-xs md:text-sm shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Servicio
          </Button>
        </div>
      </div>

      {/* Global Addons Panel */}
      {showAddonPanel && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500/5 to-indigo-500/10 px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><ListPlus className="w-5 h-5 text-indigo-500" /> Catálogo de Adicionales Globales</h2>
              <p className="text-xs text-gray-500 mt-0.5">Estos adicionales se pueden vincular a cualquier servicio. Creálos una sola vez.</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {/* Addon form */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input value={addonForm.name} onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del adicional" className="h-9 rounded-lg text-sm" />
                <Input value={addonForm.description} onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción" className="h-9 rounded-lg text-sm" />
                <CurrencyInput value={addonForm.additional_cost} onChange={v => setAddonForm(p => ({ ...p, additional_cost: v }))} className="h-9 rounded-lg text-sm" placeholder="Costo extra" />
                <select value={addonForm.additional_duration_minutes} onChange={e => setAddonForm(p => ({ ...p, additional_duration_minutes: parseInt(e.target.value) }))} className="h-9 rounded-lg text-sm border border-gray-200 bg-white px-3">
                  <option value={0}>Sin tiempo extra</option>
                  <option value={15}>+15 min</option><option value={30}>+30 min</option><option value={45}>+45 min</option><option value={60}>+1h</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddonPanel(false); setEditingAddon(null); }} className="h-9 text-xs rounded-lg">Cerrar</Button>
                <Button type="button" onClick={handleSaveAddon} className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">{editingAddon ? 'Actualizar' : 'Agregar Adicional'}</Button>
              </div>
            </div>

            {/* Addons list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {allAddons.length === 0 ? (
                <p className="text-xs text-gray-400 col-span-full text-center py-4">No hay adicionales creados aún.</p>
              ) : allAddons.map(addon => (
                <div key={addon.id} className={cn("flex items-center justify-between p-3 rounded-xl border", addon.is_active ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100 opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{addon.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>{formatDuration(addon.additional_duration_minutes)}</span>
                      <span>|</span>
                      <span className="font-bold text-gray-600">{formatCurrency(addon.additional_cost)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => handleEditAddon(addon)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteAddon(addon.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service edit form */}
      {isEditing && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-gray-50">
            <h2 className="text-xl font-black text-gray-900">{currentService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Completa los detalles de este servicio</p>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-gray-400">Nombre</Label><Input value={currentService.name} onChange={e => setCurrentService({ ...currentService, name: e.target.value })} placeholder="Ej: Corte Clásico" required className="h-10 rounded-lg text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-gray-400">Descripción</Label><Input value={currentService.description || ''} onChange={e => setCurrentService({ ...currentService, description: e.target.value })} placeholder="Breve descripción" className="h-10 rounded-lg text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-gray-400">URL Imagen</Label><Input value={currentService.image_url || ''} onChange={e => setCurrentService({ ...currentService, image_url: e.target.value })} placeholder="https://..." className="h-10 rounded-lg text-sm" /></div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-gray-400">Precio Base</Label><CurrencyInput value={currentService.base_cost} onChange={v => setCurrentService({ ...currentService, base_cost: v })} className="h-10 rounded-lg text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-gray-400">Duración</Label><DurationSelector value={currentService.duration_minutes} onChange={v => setCurrentService({ ...currentService, duration_minutes: v })} /></div>
                  <div className="flex items-center gap-3 pt-2"><Switch checked={currentService.is_active} onCheckedChange={c => setCurrentService({ ...currentService, is_active: c })} /><Label className="text-sm text-gray-600 cursor-pointer">Servicio activo</Label></div>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-6 font-bold rounded-xl border-gray-200">Cancelar</Button>
                <Button type="submit" className="h-12 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none">Guardar cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-2xl" />) : (
          services.map(service => {
            const linkedAddons = getLinkedAddonObjects(service.id);
            const availableToLink = allAddons.filter(a => !linkedAddonsMap[service.id]?.includes(a.id));
            return (
              <Card key={service.id} className={cn("border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1 flex flex-col", !service.is_active && "opacity-50 grayscale")}>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h3 className="font-bold text-gray-900 text-base leading-tight truncate">{service.name}</h3>{service.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>}</div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0", service.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/20" : "bg-gray-500/10 text-gray-600 border-gray-400/20")}>{service.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold"><Clock className="w-3.5 h-3.5 text-primary/60" /><span>{formatDuration(service.duration_minutes)}</span></div>
                    <span className="font-black text-lg text-gray-900">{formatCurrency(service.base_cost)}</span>
                  </div>
                  {service.image_url && <div className="w-full h-24 rounded-lg overflow-hidden bg-gray-100"><img src={service.image_url} alt={service.name} className="w-full h-full object-cover" /></div>}
                </div>

                {/* Linked addons - only for non-residential */}
                {!isResidential && (
                <div className="px-5 pb-3 space-y-2">
                  {linkedAddons.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-gray-400"><ListPlus className="w-3 h-3" /> Adicionales ({linkedAddons.length})</div>
                      {linkedAddons.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-[10px] p-1.5 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-gray-700 truncate">{a.name}</span>
                            <span className="text-gray-400">{formatDuration(a.additional_duration_minutes)}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-bold text-gray-600">{formatCurrency(a.additional_cost)}</span>
                            <button onClick={() => handleUnlinkAddon(service.id, a.id)} className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"><Unlink className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link addon dropdown */}
                  {openLinkServiceId === service.id ? (
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                      {availableToLink.length > 0 ? availableToLink.map(a => (
                        <button key={a.id} onClick={() => handleLinkAddon(service.id, a.id)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors text-left text-xs">
                          <span className="font-medium text-gray-700">{a.name}</span>
                          <span className="font-bold text-gray-500">{formatCurrency(a.additional_cost)}</span>
                        </button>
                      )) : <p className="text-[10px] text-gray-400 text-center py-1">Todos los adicionales ya están vinculados</p>}
                      <button onClick={() => setOpenLinkServiceId(null)} className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1">Cerrar</button>
                    </div>
                  ) : (
                    !isResidential && (
                    <button onClick={() => setOpenLinkServiceId(service.id)} className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                      <Link className="w-3 h-3" /> Vincular Adicionales
                    </button>
                    )
                  )}
                </div>
                )}

                <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex gap-2 mt-auto">
                  <button onClick={() => handleEdit(service)} className="flex-1 h-9 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Editar</button>
                  <button onClick={() => handleToggleActive(service)} className={cn("flex-1 h-9 text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center", service.is_active ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200" : "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent")}>{service.is_active ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => handleDelete(service.id)} className="h-9 w-9 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-all active:scale-95 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
