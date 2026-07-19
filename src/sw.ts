// GoGi Reservas - Service Worker
// Maneja PWA, caché offline y notificaciones push

/// <reference lib="es2020" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Placeholder para que vite-plugin-pwa inyecte el precache manifest
// @ts-expect-error Workbox inyecta este símbolo durante el build
const wbManifest = self.__WB_MANIFEST;
console.log('[SW] Precache manifest entries:', wbManifest.length);

const CACHE_NAME = 'gogi-reservas-v1';
const OFFLINE_URL = '/offline.html';

// Recursos estáticos que se cachean en la instalación
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/og-image.jpg',
];

// Estrategia: Cache First para assets estáticos, Network First para APIs
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar solicitudes de Supabase o navegación interna del router
  if (url.pathname.startsWith('/auth/') || url.pathname.includes('/rest/')) {
    return;
  }

  // Navegación: intentar red primero, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL) as Promise<Response>)
    );
    return;
  }

  // Assets estáticos: cache first
  if (
    request.destination === 'image' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// Manejar notificaciones push entrantes
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushNotificationPayload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'GoGi Reservas',
      body: 'Tienes una nueva notificación.',
      icon: '/icon-192x192.png',
      badge: '/favicon-32x32.png',
      tag: 'gogi-general',
      data: { url: '/' },
    };
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/favicon-32x32.png',
    tag: payload.tag || 'gogi-reserva',
    requireInteraction: false,
    data: payload.data || { url: '/' },
  };

  // renotify no está en el tipo de lib.dom, pero es una propiedad válida según la especificación
  (options as NotificationOptions & { renotify: boolean }).renotify = false;

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const reservationId = event.notification.data?.reservationId;

  const targetUrl = reservationId ? `${url}?reservation=${reservationId}` : url;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        for (const client of clientList) {
          if (client.url && new URL(client.url).origin === self.location.origin) {
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        return self.clients.openWindow(targetUrl);
      })
  );
});

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url: string;
    reservationId?: string;
    organizationSlug?: string;
  };
}

export {};
