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
  // Toma solo la parte de fecha y hora (YYYY-MM-DD HH:mm:ss)
  // Al quitar la 'T' y la zona horaria, forzamos al navegador a interpretarlo como hora local ("wall-clock time")
  return date.replace('T', ' ').substring(0, 19);
}

export function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? new Date(detoxTime(date)) : date;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  
  let h: number, m: number;

  if (input instanceof Date) {
    h = input.getHours();
    m = input.getMinutes();
  } else if (typeof input === 'string') {
    // Check if it's a full ISO string or just HH:mm
    if (input.includes('T') || (input.includes('-') && input.length > 5)) {
      const d = new Date(detoxTime(input));
      if (isNaN(d.getTime())) return '';
      h = d.getHours();
      m = d.getMinutes();
    } else {
      const parts = input.split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return input; // Return original if not a time string
      h = parts[0];
      m = parts[1];
    }
  } else {
    return '';
  }

  const period = h >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
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
  // Salida: "15/01/2024 10:30 a. m."
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return isoString;
  const [, year, month, day, hour, minute] = match;
  
  const h = parseInt(hour);
  const period = h >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  
  return `${day}/${month}/${year} ${hour12}:${minute} ${period}`;
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


