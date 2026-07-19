import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { SkipLink } from './components/seo/SkipLink'
import { listenForegroundPushMessages } from './lib/pushNotifications'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Registra el Service Worker de la PWA con actualización automática
registerSW({
  onNeedRefresh() {
    if (confirm('Hay una nueva versión de GoGi Reservas disponible. ¿Deseas actualizar ahora?')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.log('[PWA] La aplicación está lista para funcionar offline.')
  },
})

// Escucha mensajes del Service Worker para navegación desde notificaciones
listenForegroundPushMessages()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <SkipLink />
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
