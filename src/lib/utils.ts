import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined) {
  const numericAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 
                       (typeof amount === 'string' ? parseFloat(amount) : 0);
  const finalAmount = isNaN(numericAmount) ? 0 : numericAmount;
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(finalAmount);
}

export function detoxTime(date: string) {
  if (!date) return '';
  // Strips offsets like +00, +05:00, Z and ensures 'T' separator
  return date.replace(' ', 'T').replace(/(\+.*|Z|-[0-9]{2}:[0-9]{2})$/, '');
}

export function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? new Date(detoxTime(date)) : date;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(detoxTime(date)) : date;
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function formatDateTimeISO(isoString: string) {
  if (!isoString) return '';
  // Extrae la fecha y hora directamente de la cadena ISO sin conversión de zona horaria
  // Formato de entrada: "2024-01-15T10:30:00.000Z" o "2024-01-15T10:30:00+00:00"
  // Salida: "15/01/2024 10:30"
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return isoString;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function translateAuthError(message: string): string {
  if (!message) return 'Ha ocurrido un error inesperado';

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos';
  }
  if (lowerMessage.includes('user already registered')) {
    return 'Este correo electrónico ya está registrado';
  }
  if (lowerMessage.includes('email not confirmed')) {
    return 'Por favor, confirma tu correo electrónico antes de iniciar sesión';
  }
  if (lowerMessage.includes('password should be at least 6 characters')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (lowerMessage.includes('too many requests')) {
    return 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde';
  }
  if (lowerMessage.includes('network error')) {
    return 'Error de conexión. Por favor, verifica tu internet';
  }
  if (lowerMessage.includes('user not found')) {
    return 'Usuario no encontrado';
  }

  return message;
}
