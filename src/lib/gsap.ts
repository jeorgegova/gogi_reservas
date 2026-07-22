/**
 * Configuración centralizada de GSAP.
 * Registramos ScrollTrigger una sola vez para toda la aplicación.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registro único de plugins GSAP
gsap.registerPlugin(ScrollTrigger);

// Configuración de ScrollTrigger para dispositivos móviles:
// Evita recálculos bruscos al esconder/mostrar la barra de navegación del navegador móvil
ScrollTrigger.config({
  ignoreMobileResize: true,
});

// Referencia explícita para evitar tree-shaking en producción
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
ScrollTrigger;

export { gsap, ScrollTrigger };
