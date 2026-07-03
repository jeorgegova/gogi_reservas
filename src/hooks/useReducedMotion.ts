/**
 * Detecta si el usuario ha solicitado reducir las animaciones de movimiento.
 * Utilizamos useSyncExternalStore para suscribirnos al media query del sistema
 * sin causar renderizados en cascada.
 */
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
