/**
 * Configuración centralizada de GSAP.
 * Registramos ScrollTrigger una sola vez para toda la aplicación.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registro único de plugins GSAP
gsap.registerPlugin(ScrollTrigger);

// Referencia explícita para evitar tree-shaking en producción
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
ScrollTrigger;

export { gsap, ScrollTrigger };
