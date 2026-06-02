// ============================================================
// Diccionario de Terminología Multi-Industria
// Permite que el sistema adapte sus textos según el tipo
// de negocio de cada organización.
// ============================================================

export type BusinessType = 'residential' | 'barbershop' | 'beauty_salon' | 'workshop' | 'office' | 'other';

export interface BusinessTerminology {
  /** Nombre del tipo de negocio (ej: "Conjunto Residencial") */
  businessLabel: string;
  /** Nombre de la unidad del usuario (ej: "Apartamento", "Placa", "Silla") */
  unitLabel: string;
  /** Placeholder para el campo de unidad en el registro */
  unitPlaceholder: string;
  /** Nombre para los usuarios del sistema (ej: "Residente", "Cliente") */
  userLabel: string;
  /** Nombre para las áreas o servicios disponibles (ej: "Área Común", "Servicio", "Puesto") */
  areaLabel: string;
  /** Nombre para las reservas (ej: "Reserva", "Cita", "Turno") */
  reservationLabel: string;
  /** Ícono representativo del negocio (nombre de lucide-react) */
  icon: string;
  /** Color de acento para el badge (clase Tailwind) */
  badgeColor: string;
  /** Nombre para la sección de avisos/mantenimientos */
  noticesLabel: string;
  /** Placeholder para búsqueda o creación de avisos */
  noticesPlaceholder: string;
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTerminology> = {
  residential: {
    businessLabel: 'Conjunto Residencial',
    unitLabel: 'Apartamento',
    unitPlaceholder: 'Torre 1 - Apto 101',
    userLabel: 'Residente',
    areaLabel: 'Área Común',
    reservationLabel: 'Reserva',
    icon: 'building2',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
    noticesLabel: 'Avisos',
    noticesPlaceholder: 'Ej: Mantenimiento de ascensores',
  },
  barbershop: {
    businessLabel: 'Barbería',
    unitLabel: 'Direccion',
    unitPlaceholder: 'Ej: Calle 123, N° 456',
    userLabel: 'Cliente',
    areaLabel: 'Barbero',
    reservationLabel: 'Cita',
    icon: 'scissors',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
    noticesLabel: 'Avisos',
    noticesPlaceholder: 'Ej: Cierre por festivo',
  },
  beauty_salon: {
    businessLabel: 'Salón de Belleza / Estética',
    unitLabel: 'Direccion',
    unitPlaceholder: 'Ej: Calle 123, N° 456',
    userLabel: 'Cliente',
    areaLabel: 'Especialista',
    reservationLabel: 'Cita',
    icon: 'sparkles',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-100',
    noticesLabel: 'Avisos',
    noticesPlaceholder: 'Ej: Nuevos servicios disponibles',
  },
  workshop: {
    businessLabel: 'Taller / Automotriz',
    unitLabel: 'Direccion',
    unitPlaceholder: 'Ej: Calle 123, N° 456',
    userLabel: 'Cliente',
    areaLabel: 'Servicio',
    reservationLabel: 'Turno',
    icon: 'wrench',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-100',
    noticesLabel: 'Avisos',
    noticesPlaceholder: 'Ej: Mantenimiento de herramientas',
  },
  office: {
    businessLabel: 'Oficina / Coworking',
    unitLabel: 'Direccion',
    unitPlaceholder: 'Ej: Calle 123, N° 456',
    userLabel: 'Colaborador',
    areaLabel: 'Espacio',
    reservationLabel: 'Reserva',
    icon: 'laptop',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-100',
    noticesLabel: 'Avisos',
    noticesPlaceholder: 'Ej: Mantenimiento de red WiFi',
  },
  other: {
    businessLabel: 'Organización',
    unitLabel: 'Direccion',
    unitPlaceholder: 'Ej: Calle 123, N° 456',
    userLabel: 'Usuario',
    areaLabel: 'Espacio',
    reservationLabel: 'Reserva',
    icon: 'building',
    badgeColor: 'bg-gray-50 text-gray-700 border-gray-100',
    noticesLabel: 'Avisos',
    noticesPlaceholder: 'Ej: Comunicado importante',
  },
};

/**
 * Retorna el diccionario de terminología para el tipo de negocio dado.
 * Si no encuentra el tipo, retorna terminología genérica ("other").
 */
export function getTerminology(businessType?: string | null): BusinessTerminology {
  const type = (businessType as BusinessType) || 'residential';
  return BUSINESS_TYPES[type] ?? BUSINESS_TYPES['other'];
}

/**
 * Lista de opciones del selector de tipo de negocio para Super Admin.
 */
export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'residential', label: 'Conjunto Residencial' },
  { value: 'barbershop', label: 'Barbería' },
  { value: 'beauty_salon', label: 'Salón de Belleza / Estética' },
  { value: 'workshop', label: 'Taller / Automotriz' },
  { value: 'office', label: 'Oficina / Coworking' },
  { value: 'other', label: 'Otro' },
];
