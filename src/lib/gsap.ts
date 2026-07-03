/**
 * Configuración centralizada de GSAP.
 * Registramos ScrollTrigger una sola vez para toda la aplicación.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registro único de plugins GSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
