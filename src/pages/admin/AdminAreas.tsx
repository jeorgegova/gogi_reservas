import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Building2,
  Edit2,
  Sun,
  Moon,
  Calendar,
  Settings,
  X,
  Clock,
  Package,
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
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    <div className="flex items-center gap-2">
      <select
        value={hours}
        onChange={e => onChange(parseInt(e.target.value) * 60 + minutes)}
        className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 flex-1"
      >
        {Array.from({ length: 13 }, (_, i) => (
          <option key={i} value={i}>{i}h</option>
        ))}
      </select>
      <select
        value={minutes}
        onChange={e => onChange(hours * 60 + parseInt(e.target.value))}
        className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 flex-1"
      >
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
          <option key={m} value={m}>{m.toString().padStart(2, '0')} min</option>
        ))}
      </select>
    </div>
  );
}

interface LinkedAddon {
  addon_id: string;
  name: string;
  description: string;
  base_cost: number;
  duration_minutes: number;
  custom_price: number;
}

export default function AdminAreasPage() {
  const { profile, terminology, businessType } = useAuth();
  const isResidential = businessType === 'residential';
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>({
    name: '',
    description: '',
    max_hours_per_reservation: 4,
    cost_per_hour: 0,
    fixed_cost: 0,
    estimated_duration_minutes: 60,
    pricing_type: isResidential ? 'hourly' : 'fixed',
    cost_jornada_diurna: 0,
    cost_jornada_nocturna: 0,
    cost_jornada_ambos: 0,
    jornada_hours_diurna: 10,
    jornada_hours_nocturna: 6,
    image_url: '',
    is_active: true,
    is_free: false
  });

  const [linkedAddons, setLinkedAddons] = useState<LinkedAddon[]>([]);
  const [orgAddons, setOrgAddons] = useState<any[]>([]);
  const [showAddonSelector, setShowAddonSelector] = useState(false);
  const [showNewAddonForm, setShowNewAddonForm] = useState(false);
  const [newAddon, setNewAddon] = useState({ name: '', description: '', base_cost: 0, duration_minutes: 0 });
  const [savingAddon, setSavingAddon] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAreas();
      fetchOrgAddons();
    }
  }, [profile?.organization_id]);

  const fetchAreas = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('common_areas')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    setAreas(data || []);
    setLoading(false);
  };

  const fetchOrgAddons = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('service_addons')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('name');
    setOrgAddons(data || []);
  };

  const fetchLinkedAddons = async (areaId: string) => {
    const { data } = await supabase
      .from('common_area_addons')
      .select('*, service_addons(*)')
      .eq('common_area_id', areaId);
    if (data) {
      const mapped: LinkedAddon[] = data.map((row: any) => ({
        addon_id: row.addon_id,
        name: row.service_addons?.name || '',
        description: row.service_addons?.description || '',
        base_cost: row.service_addons?.base_cost || 0,
        duration_minutes: row.service_addons?.duration_minutes || 0,
        custom_price: row.custom_price ?? row.service_addons?.base_cost ?? 0,
      }));
      setLinkedAddons(mapped);
    }
  };

  const handleEdit = async (area: any) => {
    setCurrentArea(area);
    setLinkedAddons([]);
    setIsEditing(true);
    setShowAddonSelector(false);
    setShowNewAddonForm(false);
    await fetchLinkedAddons(area.id);
  };

  const handleStartNew = () => {
    setCurrentArea({
      name: '', description: '', max_hours_per_reservation: 4, cost_per_hour: 0,
      fixed_cost: 0, estimated_duration_minutes: 60,
      pricing_type: isResidential ? 'hourly' : 'fixed', cost_jornada_diurna: 0, cost_jornada_nocturna: 0,
      cost_jornada_ambos: 0, jornada_hours_diurna: 10, jornada_hours_nocturna: 6,
      image_url: '', is_active: true, is_free: false
    });
    setLinkedAddons([]);
    setShowAddonSelector(false);
    setShowNewAddonForm(false);
    setIsEditing(true);
  };

  const handleToggleActive = async (area: any) => {
    await supabase
      .from('common_areas')
      .update({ is_active: !area.is_active })
      .eq('id', area.id)
      .eq('organization_id', profile?.organization_id);
    fetchAreas();
  };

  const handleAddExistingAddon = (addon: any) => {
    const alreadyLinked = linkedAddons.find(la => la.addon_id === addon.id);
    if (alreadyLinked) {
      toast.error('Este servicio adicional ya está agregado');
      return;
    }
    setLinkedAddons(prev => [...prev, {
      addon_id: addon.id,
      name: addon.name,
      description: addon.description || '',
      base_cost: addon.base_cost || 0,
      duration_minutes: addon.duration_minutes || 0,
      custom_price: addon.base_cost || 0,
    }]);
    setShowAddonSelector(false);
  };

  const handleRemoveLinkedAddon = (addonId: string) => {
    setLinkedAddons(prev => prev.filter(la => la.addon_id !== addonId));
  };

  const handleUpdateLinkedAddonPrice = (addonId: string, price: number) => {
    setLinkedAddons(prev => prev.map(la => la.addon_id === addonId ? { ...la, custom_price: price } : la));
  };

  const handleCreateAndAddAddon = async () => {
    if (!profile?.organization_id || !newAddon.name.trim()) return;
    setSavingAddon(true);
    try {
      const { data, error } = await supabase
        .from('service_addons')
        .insert({
          organization_id: profile.organization_id,
          name: newAddon.name.trim(),
          description: newAddon.description || null,
          base_cost: newAddon.base_cost || 0,
          duration_minutes: newAddon.duration_minutes || 0,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setLinkedAddons(prev => [...prev, {
          addon_id: data.id,
          name: data.name,
          description: data.description || '',
          base_cost: data.base_cost || 0,
          duration_minutes: data.duration_minutes || 0,
          custom_price: data.base_cost || 0,
        }]);
        await fetchOrgAddons();
        setNewAddon({ name: '', description: '', base_cost: 0, duration_minutes: 0 });
        setShowNewAddonForm(false);
        toast.success('Servicio adicional creado y agregado');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSavingAddon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = profile?.organization_id;
    const isFree = currentArea.is_free || false;

    const areaData = {
      name: currentArea.name,
      description: currentArea.description || null,
      max_hours_per_reservation: currentArea.max_hours_per_reservation || 4,
      cost_per_hour: isFree ? 0 : (currentArea.cost_per_hour || 0),
      fixed_cost: isFree ? 0 : (currentArea.fixed_cost || 0),
      estimated_duration_minutes: currentArea.estimated_duration_minutes || 60,
      pricing_type: currentArea.pricing_type || (isResidential ? 'hourly' : 'fixed'),
      cost_jornada_diurna: isFree ? 0 : (currentArea.cost_jornada_diurna || 0),
      cost_jornada_nocturna: isFree ? 0 : (currentArea.cost_jornada_nocturna || 0),
      cost_jornada_ambos: isFree ? 0 : (currentArea.cost_jornada_ambos || 0),
      jornada_hours_diurna: currentArea.jornada_hours_diurna || 10,
      jornada_hours_nocturna: currentArea.jornada_hours_nocturna || 6,
      image_url: currentArea.image_url || null,
      is_active: currentArea.is_active !== false,
      is_free: isFree,
      organization_id: orgId
    };

    try {
      let areaId = currentArea.id;

      if (areaId) {
        const { error } = await supabase
          .from('common_areas')
          .update(areaData)
          .eq('id', areaId)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('common_areas')
          .insert(areaData)
          .select('id')
          .single();
        if (error) throw error;
        areaId = data.id;
      }

      // Sync linked addons
      await supabase
        .from('common_area_addons')
        .delete()
        .eq('common_area_id', areaId);

      if (linkedAddons.length > 0) {
        const inserts = linkedAddons.map(la => ({
          common_area_id: areaId,
          addon_id: la.addon_id,
          custom_price: la.custom_price,
        }));
        const { error: junctionError } = await supabase
          .from('common_area_addons')
          .insert(inserts);
        if (junctionError) console.error('Error saving area addons:', junctionError);
      }

      setIsEditing(false);
      fetchAreas();
      toast.success(currentArea.id ? 'Servicio actualizado' : 'Servicio creado');
    } catch (error: any) {
      console.error('Error saving area:', error);
      toast.error('Error: ' + error.message);
    }
  };

  const availableToAdd = orgAddons.filter(
    (oa: any) => !linkedAddons.find(la => la.addon_id === oa.id)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de {terminology.areaLabel}s</h1>
            <p className="text-gray-500 text-sm">Configura los espacios disponibles para {terminology.reservationLabel.toLowerCase()}s.</p>
          </div>
        </div>
        <Button
          onClick={handleStartNew}
          className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-black h-12 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva {terminology.areaLabel}
        </Button>
      </div>

      {isEditing && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-gray-50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{currentArea.id ? `Editar ${terminology.areaLabel}` : `Crear Nueva ${terminology.areaLabel}`}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Completa los detalles del espacio</p>
          </div>
          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Nombre</Label>
                    <Input
                      value={currentArea.name}
                      onChange={e => setCurrentArea({ ...currentArea, name: e.target.value })}
                      placeholder={`Ej: ${terminology.areaLabel === 'Servicio' ? 'Corte de Cabello' : 'Salón Comunal'}`}
                      required
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Descripción</Label>
                    <Input
                      value={currentArea.description}
                      onChange={e => setCurrentArea({ ...currentArea, description: e.target.value })}
                      placeholder="Breve descripción"
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">URL Imagen</Label>
                    <Input
                      value={currentArea.image_url}
                      onChange={e => setCurrentArea({ ...currentArea, image_url: e.target.value })}
                      placeholder="https://..."
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Tipo de Precio</Label>
                    <select
                      value={currentArea.pricing_type}
                      onChange={e => setCurrentArea({ ...currentArea, pricing_type: e.target.value })}
                      className="w-full h-10 rounded-lg text-sm border border-gray-200 bg-white px-3"
                    >
                      <option value="fixed">Costo Fijo por Servicio</option>
                      <option value="hourly">Costo por Hora</option>
                      <option value="jornada">Por Jornada (Día/Noche)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={currentArea.is_free}
                      onCheckedChange={(checked) => setCurrentArea({ ...currentArea, is_free: checked })}
                    />
                    <Label className="text-sm text-gray-600 cursor-pointer">{terminology.reservationLabel} sin costo</Label>
                  </div>

                  {currentArea.pricing_type === 'fixed' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Costo Total Fijo</Label>
                        <CurrencyInput
                          value={currentArea.fixed_cost}
                          onChange={(val) => setCurrentArea({ ...currentArea, fixed_cost: val })}
                          className="h-10 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Duración Estimada</Label>
                        <DurationSelector
                          value={currentArea.estimated_duration_minutes || 60}
                          onChange={val => setCurrentArea({ ...currentArea, estimated_duration_minutes: val })}
                        />
                      </div>
                    </>
                  ) : currentArea.pricing_type === 'hourly' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Máx. Horas</Label>
                        <Input
                          type="number"
                          value={currentArea.max_hours_per_reservation}
                          onChange={e => setCurrentArea({ ...currentArea, max_hours_per_reservation: parseInt(e.target.value) })}
                          required
                          className="h-10 rounded-lg text-sm"
                        />
                      </div>
                      {!currentArea.is_free && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Costo Hora</Label>
                          <CurrencyInput
                            value={currentArea.cost_per_hour}
                            onChange={(val) => setCurrentArea({ ...currentArea, cost_per_hour: val })}
                            className="h-10 rounded-lg text-sm"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Sun className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Diurna</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Desde</Label>
                              <Input type="time" value={currentArea.jornada_start_diurna || '08:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_start_diurna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Hasta</Label>
                              <Input type="time" value={currentArea.jornada_end_diurna || '18:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_end_diurna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                          </div>
                          {!currentArea.is_free && (
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                              <CurrencyInput value={currentArea.cost_jornada_diurna} onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_diurna: val })} className="h-8 rounded-lg text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Moon className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Nocturna</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Desde</Label>
                              <Input type="time" value={currentArea.jornada_start_nocturna || '18:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_start_nocturna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Hasta</Label>
                              <Input type="time" value={currentArea.jornada_end_nocturna || '23:59'} onChange={e => setCurrentArea({ ...currentArea, jornada_end_nocturna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                          </div>
                          {!currentArea.is_free && (
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                              <CurrencyInput value={currentArea.cost_jornada_nocturna} onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_nocturna: val })} className="h-8 rounded-lg text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Completo</span>
                          </div>
                          <div className="h-[62px]"></div>
                          {!currentArea.is_free && (
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                              <CurrencyInput value={currentArea.cost_jornada_ambos} onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_ambos: val })} className="h-8 rounded-lg text-xs" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="active"
                      checked={currentArea.is_active}
                      onChange={e => setCurrentArea({ ...currentArea, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary rounded border-gray-300"
                    />
                    <Label htmlFor="active" className="text-sm text-gray-600 cursor-pointer">Espacio activo</Label>
                  </div>
                </div>
              </div>

              {/* INLINE SERVICES MANAGER */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-bold text-gray-900">Servicios adicionales</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowAddonSelector(!showAddonSelector); setShowNewAddonForm(false); }}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                </div>

                {linkedAddons.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {linkedAddons.map((la) => (
                      <div key={la.addon_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{la.name}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatDuration(la.duration_minutes)}
                            </span>
                          </div>
                          {la.description && <p className="text-[10px] text-gray-400 truncate">{la.description}</p>}
                          <span className="text-[10px] text-gray-400">Base: {formatCurrency(la.base_cost)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] uppercase font-bold text-gray-400 whitespace-nowrap">Precio:</Label>
                          <CurrencyInput
                            value={la.custom_price}
                            onChange={(val) => handleUpdateLinkedAddonPrice(la.addon_id, val)}
                            className="h-8 rounded-lg text-xs w-32"
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveLinkedAddon(la.addon_id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {linkedAddons.length === 0 && !showAddonSelector && (
                  <p className="text-xs text-gray-400 text-center py-3">Sin servicios adicionales vinculados. Haz clic en "Agregar" para añadir servicios adicionales.</p>
                )}

                {/* Services selector dropdown */}
                {showAddonSelector && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Seleccionar servicio adicional existente</Label>
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
                      <p className="text-xs text-gray-400 text-center py-2">No hay servicios adicionales disponibles en la organización</p>
                    )}

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
                      <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-gray-400 font-bold">o crear uno nuevo</span></div>
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddonForm(!showNewAddonForm)} className="w-full h-8 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Crear nuevo servicio adicional
                    </Button>

                    {showNewAddonForm && (
                      <div className="border border-dashed border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3 mt-2">
                        <Input
                          value={newAddon.name}
                          onChange={e => setNewAddon({ ...newAddon, name: e.target.value })}
                          placeholder="Nombre del servicio adicional (ej: Acondicionador)"
                          className="h-9 text-sm"
                        />
                        <Input
                          value={newAddon.description}
                          onChange={e => setNewAddon({ ...newAddon, description: e.target.value })}
                          placeholder="Descripción (opcional)"
                          className="h-9 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Costo Base</Label>
                            <CurrencyInput value={newAddon.base_cost} onChange={(val) => setNewAddon({ ...newAddon, base_cost: val })} className="h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Duración Extra</Label>
                            <DurationSelector value={newAddon.duration_minutes} onChange={(val) => setNewAddon({ ...newAddon, duration_minutes: val })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddonForm(false)} className="flex-1 h-8 text-xs">Cancelar</Button>
                          <Button type="button" size="sm" onClick={handleCreateAndAddAddon} disabled={savingAddon || !newAddon.name.trim()} className="flex-1 h-8 text-xs bg-primary text-white border-none">
                            {savingAddon ? 'Creando...' : 'Crear y Agregar'}
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddonSelector(false); setShowNewAddonForm(false); }} className="w-full text-xs text-gray-500">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />)
        ) : (
          areas.filter(area => !(isEditing && currentArea.id && area.id === currentArea.id)).map((area) => (
            <Card key={area.id}
              className={cn(
                "overflow-hidden border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1",
                !area.is_active && "opacity-60 grayscale"
              )}
            >
              <div className="h-40 relative overflow-hidden group">
                {area.image_url ? (
                  <img src={area.image_url} alt={area.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <Building2 className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button size="sm" onClick={() => handleEdit(area)} className="bg-white text-gray-900 hover:bg-gray-100">
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar
                  </Button>
                  <Button size="sm" variant={area.is_active ? "destructive" : "default"} onClick={() => handleToggleActive(area)}>
                    {area.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 truncate pr-2">{area.name}</h3>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                    area.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-400 border-gray-200"
                  )}>
                    {area.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                <p className="text-xs text-gray-500 line-clamp-1">{area.description}</p>
                <div className="pt-2 flex justify-between items-center text-xs border-t border-gray-50">
                  {area.pricing_type === 'fixed' ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase">Costo Fijo</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.fixed_cost)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-gray-400 uppercase">Duración</span>
                        <span className="font-bold text-gray-600">{formatDuration(area.estimated_duration_minutes || 60)}</span>
                      </div>
                    </>
                  ) : area.pricing_type === 'jornada' ? (
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-400 uppercase">Diurna</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_jornada_diurna)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-400 uppercase">Nocturna</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_jornada_nocturna)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase">Completo</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_jornada_ambos)}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase">Costo Hora</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_per_hour)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-gray-400 uppercase">Máximo</span>
                        <span className="font-bold text-gray-600">{area.max_hours_per_reservation}h</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
