/**
 * Servicio de notificaciones push para GoGi Reservas PWA.
 *
 * Gestiona:
 * - Registro del Service Worker.
 * - Solicitud de permisos de notificación.
 * - Suscripción a Web Push con VAPID.
 * - Almacenamiento/actualización del token en Supabase.
 * - Escucha de mensajes en primer plano.
 */

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
}

/**
 * Convierte una clave VAPID base64-url a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Verifica si el navegador soporta Service Worker y Push.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Obtiene el registro del Service Worker actual.
 * Usa getRegistration en lugar de ready para no bloquear si no hay SW registrado
 * (por ejemplo, en modo desarrollo donde vite-plugin-pwa no registra el SW).
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration || null;
}

/**
 * Solicita permiso al usuario para recibir notificaciones.
 * Retorna el estado final del permiso.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return Notification.requestPermission();
}

/**
 * Genera la suscripción push usando el Service Worker y la clave VAPID.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY no está configurada.');
    return null;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    return subscription;
  } catch (err) {
    console.error('[Push] Error al suscribirse:', err);
    return null;
  }
}

/**
 * Convierte una PushSubscription al formato que guardamos en Supabase.
 */
export function serializePushSubscription(subscription: PushSubscription): PushSubscriptionData {
  const keys = subscription.toJSON().keys as { p256dh: string; auth: string };
  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: navigator.userAgent,
  };
}

/**
 * Guarda o actualiza la suscripción push del usuario autenticado en Supabase.
 */
export async function savePushSubscription(data: PushSubscriptionData): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[Push] No hay usuario autenticado. No se guarda la suscripción.');
    return;
  }

  const { error } = await supabase.from('user_push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.user_agent,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,endpoint',
    }
  );

  if (error) {
    console.error('[Push] Error guardando suscripción:', error);
  }
}

/**
 * Elimina una suscripción push del backend. Útil cuando el usuario revoca permisos
 * o el token ya no es válido.
 */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('user_push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[Push] Error eliminando suscripción:', error);
  }
}

/**
 * Inicializa todo el flujo push: registro del SW, permiso, suscripción y guardado.
 * Debe llamarse después de que el usuario inicie sesión.
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return;
  }

  // Si ya existe una suscripción, la actualizamos en el backend
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Comprobamos que la suscripción siga siendo válida comparando endpoint
    await savePushSubscription(serializePushSubscription(subscription));
    return;
  }

  // Creamos una nueva suscripción
  subscription = await subscribeToPush(registration);
  if (subscription) {
    await savePushSubscription(serializePushSubscription(subscription));
  }
}

/**
 * Escucha mensajes push mientras la app está abierta (primer plano).
 * El Service Worker se encarga de las notificaciones en segundo plano.
 */
export function listenForegroundPushMessages(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE') {
      const url = event.data.url;
      if (url) {
        window.location.href = url;
      }
    }
  });
}

/**
 * Elimina todas las suscripciones push locales y remotas del usuario.
 * Útil para cierre de sesión.
 */
export async function cleanupPushSubscriptions(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
}
