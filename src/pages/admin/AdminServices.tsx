import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Plus, Edit2, Clock, Trash2, Package, ListPlus, Link, Unlink,
  Info, CheckCircle2, Layers, Tag, X, ChevronLeft, Crown
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

function CurrencyInput({ value, onChange, className, placeholder, id }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string; id?: string }) {
  const [displayValue, setDisplayValue] = useState('');
  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  useEffect(() => { if (value) setDisplayValue(formatNumber(value)); else setDisplayValue(''); }, [value]);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <Input id={id} type="text" value={displayValue} onChange={e => { const n = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0; onChange(n); setDisplayValue(n ? formatNumber(n) : ''); }} onFocus={() => { if (value) setDisplayValue(value.toString()); }} className={cn("pl-6", className)} placeholder={placeholder || "0"} />
    </div>
  );
}

function DurationSelector({ value, onChange, id }: { value: number; onChange: (min: number) => void; id?: string }) {
  const options = [
    { label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '45 min', value: 45 },
    { label: '1 hora', value: 60 }, { label: '1h 15min', value: 75 }, { label: '1h 30min', value: 90 },
    { label: '1h 45min', value: 105 }, { label: '2 horas', value: 120 }, { label: '2h 30min', value: 150 }, { label: '3 horas', value: 180 },
  ];
  return (
    <select id={id} value={value || 30} onChange={e => onChange(parseInt(e.target.value))} className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 w-full">
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-400 leading-relaxed mt-1">{children}</p>;
}

function SectionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <Label className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1">{children}{required && <span className="text-red-400">*</span>}</Label>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="border-none apple-shadow rounded-2xl bg-white">
      <CardContent className="p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-5">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  headerAction?: React.ReactNode;
  disableOverlayClose?: boolean;
}

function SlidePanel({ isOpen, onClose, title, subtitle, children, size = 'lg', headerAction, disableOverlayClose }: SlidePanelProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !disableOverlayClose) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, disableOverlayClose]);

  const widthClass = size === 'xl' ? 'max-w-3xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl';

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={() => { if (!disableOverlayClose) onClose(); }}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative h-full w-full bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col",
          widthClass,
          visible ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-white shrink-0">
          <div className="min-w-0">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors mb-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Volver al catálogo
            </button>
            <h2 className="text-xl font-black text-gray-900 leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminServicesPage() {
  const { profile } = useAuth();
  const { isPlanFree } = useSubscriptionStatus(profile?.organization_id);
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
  const [isServicePanelOpen, setIsServicePanelOpen] = useState(false);
  const [currentService, setCurrentService] = useState<any>({ name: '', description: '', base_cost: 0, duration_minutes: 30, is_active: true, image_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submittingAddon, setSubmittingAddon] = useState(false);
  const [countAnimating, setCountAnimating] = useState(false);

  // Help card visibility
  const [showHelpCard, setShowHelpCard] = useState(true);
  useEffect(() => {
    const hidden = localStorage.getItem('gogi_services_help_hidden');
    if (hidden === 'true') setShowHelpCard(false);
  }, []);
  const handleHideHelpCard = () => {
    setShowHelpCard(false);
    localStorage.setItem('gogi_services_help_hidden', 'true');
  };

  // Global addons
  const [allAddons, setAllAddons] = useState<any[]>([]);
  const [isAddonPanelOpen, setIsAddonPanelOpen] = useState(false);
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

  const fetchAllAddons = async (animate?: boolean) => {
    if (!profile?.organization_id) return;
    const { data } = await supabase.from('service_addons').select('*').eq('organization_id', profile.organization_id).order('display_order', { ascending: true });
    setAllAddons(data || []);
    if (animate) { setCountAnimating(true); setTimeout(() => setCountAnimating(false), 1500); }
  };

  const fetchLinkedAddons = async (serviceId: string) => {
    const { data: links } = await supabase.from('service_addon_links').select('addon_id').eq('service_id', serviceId);
    setLinkedAddonsMap(prev => ({ ...prev, [serviceId]: (links || []).map((l: any) => l.addon_id) }));
  };

  // Service CRUD
  const handleEdit = (service: any) => { setCurrentService(service); setIsServicePanelOpen(true); };
  const handleStartNew = () => {
    if (isPlanFree && activeServicesCount >= 3) {
      toast.error('Plan gratuito: máximo 3 servicios activos. Actualiza tu plan para agregar más.');
      return;
    }
    setCurrentService({ name: '', description: '', base_cost: 0, duration_minutes: 30, is_active: true, image_url: '' });
    setIsServicePanelOpen(true);
  };
  const handleCloseServicePanel = () => { setIsServicePanelOpen(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !currentService.name?.trim()) return toast.error('Nombre obligatorio');
    if (submitting) return;
    setSubmitting(true);
    const willBeActive = currentService.is_active !== false;
    if (isPlanFree && !currentService.id && willBeActive && activeServicesCount >= 3) {
      setSubmitting(false);
      return toast.error('Plan gratuito: máximo 3 servicios activos. Desactiva uno antes o actualiza tu plan.');
    }
    if (isPlanFree && currentService.id && willBeActive && !currentService.is_active && activeServicesCount >= 3) {
      setSubmitting(false);
      return toast.error('Plan gratuito: máximo 3 servicios activos. Desactiva uno antes o actualiza tu plan.');
    }
    const payload = { name: currentService.name.trim(), description: currentService.description || null, base_cost: currentService.base_cost || 0, duration_minutes: currentService.duration_minutes || 30, is_active: currentService.is_active !== false, image_url: currentService.image_url || null, organization_id: profile.organization_id };
    try {
      if (currentService.id) {
        await supabase.from('services').update(payload).eq('id', currentService.id).eq('organization_id', profile.organization_id);
        toast.success('Servicio actualizado');
      } else {
        await supabase.from('services').insert(payload);
        toast.success('Servicio creado');
      }
      setIsServicePanelOpen(false); fetchServices();
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setSubmitting(false); }
  };

  const handleToggleActive = async (service: any) => {
    const willActivate = !service.is_active;
    if (isPlanFree && willActivate && activeServicesCount >= 3) {
      return toast.error('Plan gratuito: máximo 3 servicios activos. Desactiva uno antes de activar este.');
    }
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id).eq('organization_id', profile?.organization_id);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget({ type: 'service', id });
  };

    // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'service'; id: string } | { type: 'addon'; id: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Global addon CRUD
  const openAddonPanel = () => {
    setEditingAddon(null);
    setAddonForm({ name: '', description: '', additional_cost: 0, additional_duration_minutes: 0, is_active: true });
    setIsAddonPanelOpen(true);
  };
  const handleCloseAddonPanel = () => { setIsAddonPanelOpen(false); setEditingAddon(null); };

  const handleSaveAddon = async () => {
    if (!addonForm.name.trim()) return toast.error('Nombre obligatorio');
    if (!profile?.organization_id) return;
    if (submittingAddon) return;
    setSubmittingAddon(true);
    const payload = { ...addonForm, name: addonForm.name.trim(), description: addonForm.description || null, organization_id: profile.organization_id };
    try {
      if (editingAddon?.id) {
        await supabase.from('service_addons').update(payload).eq('id', editingAddon.id);
        toast.success('Adicional actualizado');
        fetchAllAddons();
      } else {
        await supabase.from('service_addons').insert(payload);
        toast.success('Adicional creado');
        fetchAllAddons(true);
      }
      setEditingAddon(null); setAddonForm({ name: '', description: '', additional_cost: 0, additional_duration_minutes: 0, is_active: true });
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setSubmittingAddon(false); }
  };

  const handleEditAddon = (addon: any) => {
    setEditingAddon(addon);
    setAddonForm({ name: addon.name, description: addon.description || '', additional_cost: addon.additional_cost || 0, additional_duration_minutes: addon.additional_duration_minutes || 0, is_active: addon.is_active });
    setIsAddonPanelOpen(true);
  };

  const handleDeleteAddon = async (id: string) => {
    setDeleteTarget({ type: 'addon', id });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'service') {
        await supabase.from('services').delete().eq('id', deleteTarget.id).eq('organization_id', profile?.organization_id);
        toast.success('Servicio eliminado'); fetchServices();
      } else {
        await supabase.from('service_addons').delete().eq('id', deleteTarget.id);
        toast.success('Adicional eliminado'); fetchAllAddons(); fetchServices();
      }
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setDeleteLoading(false); setDeleteTarget(null); }
  };

  const handleCancelAddon = () => {
    setEditingAddon(null);
    setAddonForm({ name: '', description: '', additional_cost: 0, additional_duration_minutes: 0, is_active: true });
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

  const highlightAnim = `@keyframes highlightPulse { 0% { background-color: rgb(224 231 255); transform: scale(1.05); } 100% { background-color: transparent; transform: scale(1); } }`;

  const addonCount = allAddons.length;
  const activeServicesCount = services.filter(s => s.is_active).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{highlightAnim}</style>
      {/* Sticky header for mobile + actions */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100 sm:static sm:z-auto sm:mx-0 sm:p-0 sm:bg-transparent sm:border-none sm:backdrop-blur-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg shadow-primary/25 ring-1 ring-white/20"><Package className="h-5 w-5 text-white" /></div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Servicios</h1>
              <p className="text-gray-500 text-xs md:text-sm">Crea tus servicios y los complementos que se pueden agregar a cada uno.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isResidential && (
              <Button
                onClick={openAddonPanel}
                variant="outline"
                className="h-10 md:h-12 px-4 rounded-xl font-bold text-xs md:text-sm border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
              >
                <ListPlus className="w-4 h-4 mr-1.5" /> Adicionales
                {addonCount > 0 && <span className="ml-1.5 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px]">{addonCount}</span>}
              </Button>
            )}
            <Button onClick={handleStartNew} className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-10 md:h-12 px-4 md:px-6 rounded-xl border-none text-xs md:text-sm shrink-0">
              <Plus className="w-4 h-4 mr-1.5" /> Nuevo Servicio
            </Button>
          </div>
        </div>
      </div>

      {/* How it works + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showHelpCard && (
          <Card className="lg:col-span-2 border-none apple-shadow rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 relative">
            <button
              onClick={handleHideHelpCard}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
              aria-label="Cerrar ayuda"
              title="No volver a mostrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <CardContent className="p-5 flex items-start gap-4 pr-10">
              <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">
                <Info className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-1">¿Cómo funciona el catálogo?</h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Un <strong>Servicio</strong> es lo que tus clientes reservan (ej. “Corte de cabello”).
                  Un <strong>Adicional</strong> es un extra que se puede agregar a un servicio (ej. “Mascarilla”, “Decoloración").
                  Primero crea tus adicionales y luego vínculalos a los servicios que correspondan.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none apple-shadow rounded-2xl bg-white">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <span className="text-2xl font-black text-primary">{services.length}</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Servicios</span>
            {!isResidential && (
              <span className="text-[10px] text-emerald-600 mt-0.5">{activeServicesCount} activos</span>
            )}
            {isPlanFree && !isResidential && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200"><Crown className="w-3 h-3" /> {activeServicesCount}/3</span>
            )}
            </CardContent>
          </Card>
          {!isResidential && (
            <Card className="border-none apple-shadow rounded-2xl bg-white">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                <span className="text-2xl font-black text-indigo-600">{addonCount}</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Adicionales</span>
                <span className="text-[10px] text-gray-400 mt-0.5">globales</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Service Panel (Slide-over) */}
      <SlidePanel
        isOpen={isServicePanelOpen}
        onClose={handleCloseServicePanel}
        title={currentService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
        subtitle={currentService.id ? 'Modifica los datos de este servicio.' : 'Completa los datos para publicar un nuevo servicio en tu catálogo.'}
        size="xl"
        disableOverlayClose
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form fields */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <SectionLabel required>Nombre del servicio</SectionLabel>
                <Input value={currentService.name} onChange={e => setCurrentService({ ...currentService, name: e.target.value })} placeholder="Ej: Corte Clásico" required className="h-11 rounded-xl text-sm" />
                <HelperText>Este es el nombre que verán tus clientes al reservar.</HelperText>
              </div>
              <div className="space-y-1.5">
                <SectionLabel>Descripción</SectionLabel>
                <Input value={currentService.description || ''} onChange={e => setCurrentService({ ...currentService, description: e.target.value })} placeholder="Breve descripción de qué incluye el servicio" className="h-11 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <SectionLabel>Precio base</SectionLabel>
                  <CurrencyInput value={currentService.base_cost} onChange={v => setCurrentService({ ...currentService, base_cost: v })} className="h-11 rounded-xl text-sm" />
                  <HelperText>Precio inicial. Los adicionales suman a este valor.</HelperText>
                </div>
                <div className="space-y-1.5">
                  <SectionLabel>Duración</SectionLabel>
                  <DurationSelector value={currentService.duration_minutes} onChange={v => setCurrentService({ ...currentService, duration_minutes: v })} />
                  <HelperText>Tiempo que ocupa en el calendario.</HelperText>
                </div>
              </div>
              <div className="space-y-1.5">
                <SectionLabel>URL de imagen</SectionLabel>
                <Input value={currentService.image_url || ''} onChange={e => setCurrentService({ ...currentService, image_url: e.target.value })} placeholder="https://..." className="h-11 rounded-xl text-sm" />
                <HelperText>Imagen opcional para mostrar en el catálogo.</HelperText>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <Switch id="service-active" checked={currentService.is_active} onCheckedChange={c => setCurrentService({ ...currentService, is_active: c })} />
                <div>
                  <Label htmlFor="service-active" className="text-sm font-semibold text-gray-700 cursor-pointer">Servicio activo</Label>
                  <HelperText>Los servicios inactivos no aparecen disponibles para reservar.</HelperText>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-3">
              <SectionLabel>Vista previa en el catálogo</SectionLabel>
              <Card className={cn("border-none apple-shadow rounded-2xl overflow-hidden", !currentService.is_active && "opacity-60 grayscale")}>
                {currentService.image_url ? (
                  <div className="w-full aspect-[4/3] bg-gray-100">
                    <img src={currentService.image_url} alt="Vista previa" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-200" />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{currentService.name || 'Nombre del servicio'}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{currentService.description || 'Descripción del servicio'}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500 font-semibold inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary/60" />{formatDuration(currentService.duration_minutes || 30)}</span>
                    <span className="font-black text-xl text-gray-900">{formatCurrency(currentService.base_cost || 0)}</span>
                  </div>
                </CardContent>
              </Card>
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Tip:</strong> Así se verá este servicio cuando un cliente entre a reservar. Asegúrate de que el nombre sea claro y el precio sea correcto.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 sticky bottom-0 bg-white py-4 -mx-6 px-6">
            <Button type="button" variant="outline" onClick={handleCloseServicePanel} className="h-11 px-6 font-bold rounded-xl border-gray-200">Cancelar</Button>
            <Button type="submit" disabled={submitting} className="h-11 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Guardando...' : currentService.id ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* Addon Panel (Slide-over) */}
      <SlidePanel
        isOpen={isAddonPanelOpen}
        onClose={handleCloseAddonPanel}
        title="Biblioteca de Adicionales"
        subtitle="Crea aquí los extras una sola vez. Después podrás agregarlos a cada servicio."
        size="lg"
        disableOverlayClose
      >
        <div className="space-y-6">
          {/* Addon form */}
          <div className="p-5 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                {editingAddon ? <Edit2 className="w-3.5 h-3.5 text-indigo-600" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <h3 className="text-sm font-bold text-gray-900">{editingAddon ? 'Editar adicional' : 'Nuevo adicional'}</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <SectionLabel required>Nombre del adicional</SectionLabel>
                <Input value={addonForm.name} onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Mascarilla hidratante" className="h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <SectionLabel>Descripción</SectionLabel>
                <Input value={addonForm.description} onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descripción para el cliente" className="h-11 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <SectionLabel required>Costo extra</SectionLabel>
                  <CurrencyInput value={addonForm.additional_cost} onChange={v => setAddonForm(p => ({ ...p, additional_cost: v }))} className="h-11 rounded-xl text-sm" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <SectionLabel>Tiempo extra</SectionLabel>
                  <select value={addonForm.additional_duration_minutes} onChange={e => setAddonForm(p => ({ ...p, additional_duration_minutes: parseInt(e.target.value) }))} className="h-11 rounded-xl text-sm border border-gray-200 bg-white px-3 w-full">
                    <option value={0}>Sin tiempo extra</option>
                    <option value={15}>+15 min</option><option value={30}>+30 min</option><option value={45}>+45 min</option><option value={60}>+1 hora</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Switch id="addon-active" checked={addonForm.is_active} onCheckedChange={c => setAddonForm(p => ({ ...p, is_active: c }))} />
                <Label htmlFor="addon-active" className="text-sm text-gray-600 cursor-pointer">Adicional activo</Label>
              </div>
              <div className="flex gap-2">
                {editingAddon && (
                  <Button type="button" variant="outline" onClick={handleCancelAddon} className="h-10 text-xs rounded-xl border-gray-200">Cancelar</Button>
                )}
                <Button type="button" onClick={handleSaveAddon} disabled={submittingAddon} className="h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submittingAddon ? 'Guardando...' : editingAddon ? 'Actualizar adicional' : 'Crear adicional'}
                </Button>
              </div>
            </div>
          </div>

          {/* Addons list */}
          {allAddons.length === 0 ? (
            <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3">
                <ListPlus className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-900">Aún no tienes adicionales</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Crea el primero arriba y luego vínculalo a tus servicios desde el catálogo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className={cn("text-xs font-bold uppercase tracking-wide inline-block px-2 py-0.5 rounded-lg transition-all duration-700", countAnimating ? "text-indigo-700 bg-indigo-100 scale-105" : "text-gray-400")} style={countAnimating ? { animation: 'highlightPulse 1.5s ease-out' } : undefined}>Adicionales creados ({allAddons.length})</h4>
              <div className="space-y-2">
                {allAddons.map(addon => (
                  <div key={addon.id} className={cn("flex items-center justify-between p-4 rounded-xl border", addon.is_active ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100 opacity-50")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{addon.name}</p>
                      {addon.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{addon.description}</p>}
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1.5">
                        <span className="inline-flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3" />{formatDuration(addon.additional_duration_minutes)}</span>
                        <span className="inline-flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded font-bold text-gray-700"><Tag className="w-3 h-3" />{formatCurrency(addon.additional_cost)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button onClick={() => handleEditAddon(addon)} className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteAddon(addon.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SlidePanel>

      {/* Services grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-56 bg-gray-50 animate-pulse rounded-2xl" />)}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no tienes servicios"
          description="Comienza creando tu primer servicio. Los servicios son lo que tus clientes podrán reservar desde tu catálogo."
          action={
            <Button onClick={handleStartNew} className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-11 px-6 rounded-xl border-none">
              <Plus className="w-4 h-4 mr-1.5" /> Crear primer servicio
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => {
            const linkedAddons = getLinkedAddonObjects(service.id);
            const availableToLink = allAddons.filter(a => !linkedAddonsMap[service.id]?.includes(a.id));
            const isLinkOpen = openLinkServiceId === service.id;
            return (
              <Card key={service.id} className={cn("border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1 flex flex-col", !service.is_active && "opacity-50 grayscale")}>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{service.name}</h3>
                      {service.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>}
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase border shrink-0", service.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/20" : "bg-gray-500/10 text-gray-600 border-gray-400/20")}>{service.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold"><Clock className="w-3.5 h-3.5 text-primary/60" /><span>{formatDuration(service.duration_minutes)}</span></div>
                    <span className="font-black text-lg text-gray-900">{formatCurrency(service.base_cost)}</span>
                  </div>
                  {service.image_url && <div className="w-full h-28 rounded-xl overflow-hidden bg-gray-100"><img src={service.image_url} alt={service.name} className="w-full h-full object-cover" /></div>}
                </div>

                {/* Linked addons - only for non-residential */}
                {!isResidential && (
                  <div className="px-5 pb-4 space-y-3">
                    {/* Addon header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-gray-500">
                        <Layers className="w-3.5 h-3.5" />
                        Adicionales incluidos
                        {linkedAddons.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px]">{linkedAddons.length}</span>}
                      </div>
                    </div>

                    {linkedAddons.length > 0 && (
                      <div className="space-y-1.5">
                        {linkedAddons.map(a => (
                          <div key={a.id} className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="font-medium text-gray-700 truncate">{a.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-gray-400">{formatDuration(a.additional_duration_minutes)}</span>
                              <span className="font-bold text-gray-700">{formatCurrency(a.additional_cost)}</span>
                              <button onClick={() => handleUnlinkAddon(service.id, a.id)} className="p-1 hover:bg-red-100 rounded-md text-gray-400 hover:text-red-500 transition-colors" title="Quitar adicional"><Unlink className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Link addon dropdown */}
                    {isLinkOpen ? (
                      <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-1">Selecciona un adicional</p>
                        {availableToLink.length > 0 ? availableToLink.map(a => (
                          <button key={a.id} onClick={() => handleLinkAddon(service.id, a.id)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors text-left text-xs border border-transparent hover:border-indigo-100">
                            <span className="font-medium text-gray-700">{a.name}</span>
                            <span className="font-bold text-gray-500">{formatCurrency(a.additional_cost)}</span>
                          </button>
                        )) : <p className="text-[11px] text-gray-500 text-center py-2">Ya vinculaste todos los adicionales disponibles.</p>}
                        <button onClick={() => setOpenLinkServiceId(null)} className="w-full text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 py-1.5 mt-1">Cerrar selección</button>
                      </div>
                    ) : (
                      <button onClick={() => setOpenLinkServiceId(service.id)} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                        <Link className="w-3.5 h-3.5" /> {linkedAddons.length > 0 ? 'Agregar otro adicional' : 'Vincular adicionales'}
                      </button>
                    )}
                  </div>
                )}

                <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex gap-2 mt-auto">
                  <button onClick={() => handleEdit(service)} className="flex-1 h-10 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Editar</button>
                  <button onClick={() => handleToggleActive(service)} className={cn("flex-1 h-10 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center", service.is_active ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200" : "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent")}>{service.is_active ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => handleDelete(service.id)} className="h-10 w-10 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-100 transition-all active:scale-95 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'service' ? 'Eliminar servicio' : 'Eliminar adicional'}
        description={deleteTarget?.type === 'service' ? '¿Estás seguro de que quieres eliminar este servicio? Se desvinculará de todas las reservas.' : '¿Estás seguro de que quieres eliminar este adicional? Se desvinculará de todos los servicios.'}
        confirmText="Eliminar"
        onConfirm={confirmDelete}
        variant="destructive"
        loading={deleteLoading}
        className="z-[200]"
      />

      {/* Floating action button for mobile */}
      <button
        onClick={handleStartNew}
        className="sm:hidden fixed bottom-6 right-6 z-40 h-14 w-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center transition-transform active:scale-90"
        aria-label="Nuevo servicio"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
